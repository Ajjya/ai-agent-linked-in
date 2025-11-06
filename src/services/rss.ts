import Parser from 'rss-parser';
import axios from 'axios';
import config from '../config';
import databaseService from './database';
import aiContentService from './aiContent';

interface RSSItem {
  guid: string;
  title: string;
  link: string;
  contentSnippet?: string;
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
  private postCounter: number = 0; // Track number of posts created in this session

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
      console.log(`⏭️  Already processed: ${item.title}`);
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

    console.log(`\n📝 New RSS item stored: ${item.title}`);
    console.log(`   Published: ${pubDate.toLocaleDateString()}`);

    // Create potential post from RSS item
    await this.createPostFromRSSItem(item);
  }

  private async createPostFromRSSItem(item: RSSItem): Promise<void> {
    const guid = item.guid || item.link;
    const pubDate = new Date(item.pubDate);

    // Skip items older than 60 days (2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    if (pubDate < twoMonthsAgo) {
      console.log(`⏭️  Skipping old article (${pubDate.toLocaleDateString()}): ${item.title}`);
      await databaseService.markRssItemProcessed(guid);
      return;
    }

    const category = this.categorizePost(item);
    const imageUrl = this.extractImageUrl(item);
    
    let title = item.title || 'MongoDB News';
    let postContent: string;

    try {
      // AI content generation is REQUIRED
      const aiConfigured = await aiContentService.isConfigured();
      if (!aiConfigured) {
        console.error(`❌ AI not configured. Skipping post - OPENAI_API_KEY is required`);
        console.log(`   💡 Set OPENAI_API_KEY in .env to enable AI content generation`);
        return;
      }

      console.log(`\n🤖 AI Content Generation for: ${item.title}`);
      const description = this.cleanDescription(item.contentSnippet || item.content || '');
      
      try {
        console.log(`   ⏳ Calling ChatGPT (${category})...`);
        const aiContent = await aiContentService.generateLinkedInContent({
          title,
          description,
          link: item.link || '',
          category
        });
        
        title = aiContent.title;
        postContent = aiContent.content;
        console.log(`   ✅ AI Generated Title: ${title}`);
        console.log(`   ✅ AI Generated Content (${postContent.length} chars)`);
      } catch (aiError: any) {
        console.error(`❌ AI generation failed: ${aiError.message}`);
        console.log(`   ⚠️ Skipping post due to AI generation error`);
        throw aiError;
      }

      const postData: any = {
        title,
        content: postContent,
        sourceUrl: item.link,
        sourceType: 'rss',
        category,
        tags: item.categories || [],
        scheduledAt: this.calculateScheduledDate(),
      };

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      const post = await databaseService.createPost(postData);

      console.log(`\n📅 Post created and scheduled:`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Title: ${post.title}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   Scheduled: ${post.scheduledAt.toLocaleString()}`);
      console.log(`   Content length: ${post.content.length} characters\n`);
      
      await databaseService.markRssItemProcessed(guid);
    } catch (error) {
      console.error('❌ Error creating post from RSS item:', error);
    }
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
      .trim();

    // Only remove the very last "footer" line, not the main content
    cleaned = cleaned.replace(/\s*The post.*?first appeared on.*$/i, '');
    
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

  private calculateScheduledDate(): Date {
    const now = new Date();
    const scheduledDate = new Date(now);

    // Get posting configuration
    const postingDays = config.posting.days; // [2, 5] for Tuesday, Friday
    const timeParts = config.posting.time.split(':').map(Number);
    const hour = timeParts[0] || 10;
    const minute = timeParts[1] || 30;

    // Calculate which posting slot this post should take
    // Distribute posts across future posting days
    const daysToAdd = Math.floor(this.postCounter / 1); // 1 post per day
    this.postCounter++; // Increment for next post

    // Find the next posting day, then add additional days based on counter
    let totalDaysToAdd = 0;
    const today = now.getDay();
    
    // First, find the next posting day
    let foundFirstDay = false;
    for (let i = 0; i < 7; i++) {
      const checkDay = (today + i + 1) % 7;
      if (postingDays.includes(checkDay)) {
        totalDaysToAdd = i + 1;
        foundFirstDay = true;
        break;
      }
    }

    if (!foundFirstDay) {
      totalDaysToAdd = 1; // Fallback
    }

    // Now add additional posting days based on post counter
    let additionalDays = 0;
    for (let i = 0; i < daysToAdd; i++) {
      // Find next posting day after current position
      for (let j = 1; j <= 7; j++) {
        const checkDay = (today + totalDaysToAdd + additionalDays + j) % 7;
        if (postingDays.includes(checkDay)) {
          additionalDays += j;
          break;
        }
      }
    }

    totalDaysToAdd += additionalDays;

    scheduledDate.setDate(now.getDate() + totalDaysToAdd);
    scheduledDate.setHours(hour, minute, 0, 0);

    return scheduledDate;
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

  async generateContentSummary(): Promise<{
    totalItems: number;
    recentItems: number;
    categories: Record<string, number>;
  }> {
    // This would return stats about processed RSS content
    return {
      totalItems: 0,
      recentItems: 0,
      categories: {}
    };
  }
}

export default new RSSContentService();