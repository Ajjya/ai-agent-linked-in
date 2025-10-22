import Parser from 'rss-parser';
import axios from 'axios';
import config from '../config';
import databaseService from './database';

interface RSSItem {
  guid: string;
  title: string;
  link: strin      tutorial: `🎯 {title}

{keyPoints}

🔗 Read more: {link}

{hashtags}`,entSnippet?: string;
  content?: string;
  pubDate: string;
  categories?: string[];
  'media:content'?: {
    $: {
      url: string;
    };
  };
}

class RSSContentService {
  private parser: Parser<{}, RSSItem>;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['content:encoded', 'content'],
        ],
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
      },
    });
  }

  async fetchAndProcessRSS(): Promise<void> {
    try {
      console.log('📡 Fetching MongoDB RSS feed...');
      
      // Try alternative RSS feeds if main one fails
      const rssUrls = [
        config.content.mongodbRssUrl,
        ...config.content.fallbackRssUrls,
      ];

      let feed: any = null;
      let lastError: Error | null = null;

      for (const url of rssUrls) {
        try {
          console.log(`🔗 Trying RSS URL: ${url}`);
          feed = await this.parser.parseURL(url);
          console.log(`✅ Successfully parsed RSS from: ${url}`);
          break;
        } catch (error: any) {
          console.log(`⚠️ Failed to parse RSS from ${url}:`, error.message);
          lastError = error;
          continue;
        }
      }

      if (!feed) {
        console.error('❌ Failed to fetch RSS from all sources');
        if (lastError) {
          throw lastError;
        }
        throw new Error('Unable to fetch RSS feed from any source');
      }

      console.log(`📰 Found ${feed.items?.length || 0} items in RSS feed`);

      if (!feed.items) {
        console.log('⚠️ No items found in RSS feed');
        return;
      }

      for (const item of feed.items) {
        await this.processRSSItem(item);
      }

      console.log('✅ RSS processing completed');
    } catch (error) {
      console.error('❌ Error processing RSS feed:', error);
      // Don't throw the error, just log it to prevent app crash
      console.log('🔄 RSS processing will be retried on next scheduled run');
    }
  }

  private async processRSSItem(item: RSSItem): Promise<void> {
    const guid = item.guid || item.link;
    if (!guid) {
      console.log('⚠️ Skipping item without GUID or link');
      return;
    }

    // Check if item already exists
    const existingItem = await databaseService.getRssItem(guid);
    if (existingItem) {
      return; // Skip if already processed
    }

    // Store RSS item
    const pubDate = new Date(item.pubDate);
    await databaseService.createRssItem({
      guid,
      title: item.title || 'Untitled',
      link: item.link || '',
      description: item.contentSnippet || item.content || '',
      pubDate,
    });

    console.log(`📝 New RSS item stored: ${item.title}`);

    // Create potential post from RSS item
    await this.createPostFromRSSItem(item);
  }

  private async createPostFromRSSItem(item: RSSItem): Promise<void> {
    const guid = item.guid || item.link;
    const pubDate = new Date(item.pubDate);

    // Skip items older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (pubDate < thirtyDaysAgo) {
      await databaseService.markRssItemProcessed(guid);
      return;
    }

    const postContent = this.generatePostContent(item);
    const imageUrl = this.extractImageUrl(item);
    const category = this.categorizePost(item);

    try {
      const postData: any = {
        title: item.title || 'MongoDB News',
        content: postContent,
        sourceUrl: item.link,
        sourceType: 'rss',
        category,
        tags: item.categories || [],
        scheduledAt: this.calculateScheduledDate(pubDate),
      };

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      const post = await databaseService.createPost(postData);

      console.log(`📅 Created scheduled post: ${post.title}`);
      await databaseService.markRssItemProcessed(guid);
    } catch (error) {
      console.error('❌ Error creating post from RSS item:', error);
    }
  }

  private generatePostContent(item: RSSItem): string {
    const title = item.title || 'MongoDB Update';
    const description = this.cleanDescription(item.contentSnippet || item.content || '');
    const category = this.categorizePost(item);
    
    return this.createEngagingPost(title, description, item.link || '', category);
  }

  private createEngagingPost(title: string, description: string, link: string, category: string): string {
    const templates = this.getPostTemplates();
    const template = templates[category] || templates.general;
    
    if (!template) {
      throw new Error('No template found for category: ' + category);
    }
    
    // Extract key points from description
    const keyPoints = this.extractKeyPoints(description);
    const hook = this.generateHook(title, category);
    const callToAction = this.generateCallToAction(category);
    const hashtags = this.generateHashtags(title, category);
    
    let content = template
      .replace('{hook}', hook)
      .replace('{title}', title)
      .replace('{keyPoints}', keyPoints)
      .replace('{callToAction}', callToAction)
      .replace('{link}', link)
      .replace('{hashtags}', hashtags);

    // Ensure content doesn't exceed LinkedIn's character limit
    if (content.length > config.posting.maxPostLength) {
      content = content.substring(0, config.posting.maxPostLength - 3) + '...';
    }

    return content;
  }

  private getPostTemplates(): Record<string, string> {
    return {
      tutorial: `🎯 {title}

{keyPoints}

� Полезно для разработчиков MongoDB

🔗 Подробнее: {link}

{hashtags}`,

      case_study: `📊 {title}

{keyPoints}

💼 Реальный опыт применения MongoDB

🔗 Читать кейс: {link}

{hashtags}`,

      announcement: `🎉 {title}

{keyPoints}

✨ Новые возможности MongoDB

🔗 Узнать больше: {link}

{hashtags}`,

      general: `🍃 {title}

{keyPoints}

💡 Полезные инсайты для MongoDB разработчиков

🔗 Читать статью: {link}

{hashtags}`
    };
  }

  private extractKeyPoints(description: string): string {
    if (!description || description.length < 50) {
      return 'Discover new MongoDB features and best practices that can improve your development workflow and database performance.';
    }

    // Take meaningful content and make it longer
    const paragraphs = description.split('\n').filter(p => p.trim().length > 20);
    let mainContent = paragraphs.slice(0, 2).join(' ').trim() || description;

    // Clean up but keep more content
    mainContent = mainContent
      .replace(/^(The post|Continue reading|Learn more).*$/gm, '') // Remove footers
      .replace(/\s+/g, ' ') // Clean whitespace
      .trim();

    // Expand content to be more descriptive (aim for 300-500 chars)
    if (mainContent.length < 200) {
      // Try to get more content from the description
      const allText = description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (allText.length > mainContent.length) {
        mainContent = allText.substring(0, 400).trim();
      }
    }

    // If still too long, trim properly without cutting words
    if (mainContent.length > 500) {
      const trimmed = mainContent.substring(0, 480);
      const lastSpace = trimmed.lastIndexOf(' ');
      mainContent = trimmed.substring(0, lastSpace) + '...';
    }

    return mainContent;
  }

  private generateHook(title: string, category: string): string {
    const hooks = {
      tutorial: [
        '🎓 Ready to master MongoDB?',
        '💻 Want to boost your database skills?',
        '🚀 Looking to optimize your MongoDB setup?'
      ],
      case_study: [
        '📈 See how companies scale with MongoDB:',
        '💼 Real success story alert!',
        '🏆 Another MongoDB success story:'
      ],
      announcement: [
        '🔥 Big news in the MongoDB world!',
        '⚡ Breaking: MongoDB just got better!',
        '🎉 Exciting update for MongoDB developers!'
      ],
      general: [
        '💡 MongoDB insights you need to know:',
        '🍃 Fresh from the MongoDB blog:',
        '📚 Essential reading for MongoDB developers:'
      ]
    };

    const categoryHooks = hooks[category as keyof typeof hooks] || hooks.general;
    const selectedHook = categoryHooks[Math.floor(Math.random() * categoryHooks.length)];
    return selectedHook || hooks.general[0] || '💡 MongoDB insights you need to know:';
  }

  private generateCallToAction(category: string): string {
    const ctas = {
      tutorial: [
        '👩‍� Ready to try this yourself?',
        '🛠️ Time to implement these techniques!',
        '📖 Follow along with the tutorial!'
      ],
      case_study: [
        '🤔 How could this work for your project?',
        '💭 Inspired to try something similar?',
        '📊 What results could you achieve?'
      ],
      announcement: [
        '🔄 Will you be upgrading?',
        '⭐ What feature are you most excited about?',
        '💬 Share your thoughts below!'
      ],
      general: [
        '💬 What are your thoughts?',
        '🔄 Share if this helped you!',
        '👍 Found this useful? Let others know!'
      ]
    };

    const categoryCtas = ctas[category as keyof typeof ctas] || ctas.general;
    const selectedCta = categoryCtas[Math.floor(Math.random() * categoryCtas.length)];
    return selectedCta || ctas.general[0] || '💬 What are your thoughts?';
  }

  private generateHashtags(title: string, category: string): string {
    const baseHashtags = ['#MongoDB', '#Database', '#NoSQL'];
    const categoryHashtags: Record<string, string[]> = {
      tutorial: ['#Tutorial', '#Learning', '#Development', '#Programming'],
      case_study: ['#CaseStudy', '#Success', '#Enterprise', '#Scale'],
      announcement: ['#News', '#Update', '#Innovation', '#Technology'],
      general: ['#DataManagement', '#TechTips', '#Development']
    };

    const titleHashtags = this.extractHashtagsFromTitle(title);
    const selected = [
      ...baseHashtags,
      ...(categoryHashtags[category] || categoryHashtags.general || []).slice(0, 2),
      ...titleHashtags.slice(0, 2)
    ];

    return [...new Set(selected)].join(' ');
  }

  private extractHashtagsFromTitle(title: string): string[] {
    const hashtags: string[] = [];
    const titleLower = title.toLowerCase();

    const keywordMap: Record<string, string> = {
      'atlas': '#Atlas',
      'search': '#Search',
      'ai': '#AI',
      'vector': '#VectorSearch',
      'performance': '#Performance',
      'security': '#Security',
      'cloud': '#Cloud',
      'analytics': '#Analytics',
      'aggregation': '#Aggregation',
      'compass': '#Compass',
      'optimization': '#Optimization'
    };

    for (const [keyword, hashtag] of Object.entries(keywordMap)) {
      if (titleLower.includes(keyword)) {
        hashtags.push(hashtag);
      }
    }

    return hashtags;
  }

  private cleanDescription(description: string): string {
    if (!description) return '';

    // Remove HTML tags and clean up description
    let cleaned = description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#x27;/g, "'") // Replace &#x27; with '
      .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove other HTML entities
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/^\s*The post.*first appeared on.*$/gm, '') // Remove footer text
      .replace(/^\s*Continue reading.*$/gm, '') // Remove "Continue reading" text
      .trim();

    // Remove common unwanted phrases
    const unwantedPhrases = [
      'The post',
      'first appeared on',
      'Continue reading',
      'Read more',
      'Learn more',
      'Click here'
    ];

    unwantedPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      cleaned = cleaned.replace(regex, '');
    });

    return cleaned.trim();
  }

  private extractImageUrl(item: RSSItem): string | undefined {
    // Try to extract image from media:content
    if (item['media:content']?.$ && item['media:content'].$.url) {
      return item['media:content'].$.url;
    }

    // Try to extract image from content
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/i);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }

    return undefined;
  }

  private categorizePost(item: RSSItem): string {
    const title = (item.title || '').toLowerCase();
    const content = (item.contentSnippet || item.content || '').toLowerCase();
    const categories = (item.categories || []).map(cat => cat.toLowerCase());

    // Tutorial patterns
    const tutorialKeywords = ['tutorial', 'how to', 'guide', 'step by step', 'getting started', 'learn', 'master'];
    if (tutorialKeywords.some(keyword => title.includes(keyword) || content.includes(keyword))) {
      return 'tutorial';
    }

    // Case study patterns
    const caseStudyKeywords = ['case study', 'success story', 'customer story', 'real world', 'implementation', 'deployment'];
    if (caseStudyKeywords.some(keyword => title.includes(keyword) || content.includes(keyword))) {
      return 'case_study';
    }

    // Announcement patterns
    const announcementKeywords = ['announcement', 'release', 'new', 'introducing', 'launched', 'available', 'update'];
    if (announcementKeywords.some(keyword => title.includes(keyword) || content.includes(keyword))) {
      return 'announcement';
    }

    // Tips patterns
    const tipsKeywords = ['tip', 'best practice', 'optimization', 'performance', 'trick', 'advice'];
    if (tipsKeywords.some(keyword => title.includes(keyword) || content.includes(keyword))) {
      return 'tutorial';
    }

    return 'general'; // Default category
  }

  private calculateScheduledDate(pubDate: Date): Date {
    const now = new Date();
    const scheduledDate = new Date(now);

    // Get next posting day
    const postingDays = config.posting.days; // [2, 5] for Tuesday, Friday
    const timeParts = config.posting.time.split(':').map(Number);
    const hour = timeParts[0] || 10;
    const minute = timeParts[1] || 30;

    // Find next posting day
    let daysUntilNext = 1;
    const today = now.getDay();

    for (let i = 0; i < 7; i++) {
      const checkDay = (today + i + 1) % 7;
      if (postingDays.includes(checkDay)) {
        daysUntilNext = i + 1;
        break;
      }
    }

    scheduledDate.setDate(now.getDate() + daysUntilNext);
    scheduledDate.setHours(hour, minute, 0, 0);

    // If it's today and time has passed, schedule for next posting day
    if (daysUntilNext === 0 && now.getHours() > hour) {
      for (let i = 1; i < 7; i++) {
        const checkDay = (today + i) % 7;
        if (postingDays.includes(checkDay)) {
          scheduledDate.setDate(now.getDate() + i);
          break;
        }
      }
    }

    return scheduledDate;
  }

  async getUnprocessedContent(): Promise<any[]> {
    return databaseService.getUnprocessedRssItems();
  }

  async generateContentSummary(): Promise<{
    totalItems: number;
    recentItems: number;
    unprocessedItems: number;
  }> {
    const client = databaseService.getClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalItems, recentItems, unprocessedItems] = await Promise.all([
      client.rssItem.count(),
      client.rssItem.count({
        where: {
          pubDate: {
            gte: sevenDaysAgo,
          },
        },
      }),
      client.rssItem.count({
        where: {
          processed: false,
        },
      }),
    ]);

    return {
      totalItems,
      recentItems,
      unprocessedItems,
    };
  }
}

export default new RSSContentService();