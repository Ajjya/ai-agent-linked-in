import Parser from 'rss-parser';
import axios from 'axios';
import config from '../config';
import databaseService from './database';

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

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['content:encoded', 'content'],
        ],
      },
    });
  }

  async fetchAndProcessRSS(): Promise<void> {
    try {
      console.log('📡 Fetching MongoDB RSS feed...');
      const feed = await this.parser.parseURL(config.content.mongodbRssUrl);

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
      throw error;
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
    const link = item.link;

    // Create engaging LinkedIn post
    let content = `🍃 ${title}\n\n`;

    if (description) {
      // Limit description to ~200 characters for LinkedIn
      const shortDescription = description.length > 200 
        ? description.substring(0, 200) + '...'
        : description;
      
      content += `${shortDescription}\n\n`;
    }

    content += `💡 Key insights for MongoDB developers and data architects.\n\n`;
    content += `🔗 Read more: ${link}\n\n`;
    content += `#MongoDB #Database #NoSQL #DataManagement #TechTips`;

    // Ensure content doesn't exceed LinkedIn's character limit
    if (content.length > config.posting.maxPostLength) {
      content = content.substring(0, config.posting.maxPostLength - 3) + '...';
    }

    return content;
  }

  private cleanDescription(description: string): string {
    // Remove HTML tags and clean up description
    return description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/&[a-zA-Z]+;/g, '') // Remove HTML entities
      .trim();
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

    // Categorization rules
    if (categories.includes('tutorial') || title.includes('tutorial') || title.includes('how to')) {
      return 'tutorial';
    }

    if (categories.includes('announcement') || title.includes('announcement') || title.includes('release')) {
      return 'news';
    }

    if (title.includes('tip') || title.includes('best practice') || content.includes('tip')) {
      return 'tips';
    }

    if (title.includes('case study') || content.includes('case study') || categories.includes('case-study')) {
      return 'case-study';
    }

    return 'news'; // Default category
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