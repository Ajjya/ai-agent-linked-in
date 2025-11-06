import { PrismaClient } from '@prisma/client';
import config from '../config';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    console.log('📋 Database disconnected');
  }

  // Post methods
  async createPost(data: {
    title: string;
    content: string;
    sourceUrl?: string;
    imageUrl?: string;
    sourceType?: string;
    scheduledAt?: Date;
    category?: string;
    tags?: string[];
  }): Promise<any> {
    return this.prisma.post.create({
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : null,
      },
    });
  }

  async getPostById(id: string): Promise<any> {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        publishLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getScheduledPosts(): Promise<any[]> {
    const now = new Date();
    return this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: now,
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }

  async getPosts(limit = 50): Promise<any[]> {
    return this.prisma.post.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        publishLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async updatePostStatus(
    id: string,
    status: string,
    linkedinPostId?: string,
    publishedAt?: Date
  ): Promise<any> {
    const updateData: any = { status };
    
    if (linkedinPostId !== undefined) {
      updateData.linkedinPostId = linkedinPostId;
    }
    
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt;
    }

    return this.prisma.post.update({
      where: { id },
      data: updateData,
    });
  }

  // Settings methods
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value || null;
  }

  async setSetting(key: string, value: string): Promise<any> {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // RSS items methods
  async getRssItem(guid: string): Promise<any> {
    return this.prisma.rssItem.findUnique({
      where: { guid },
    });
  }

  async createRssItem(data: {
    guid: string;
    title: string;
    link: string;
    description: string;
    pubDate: Date;
  }): Promise<any> {
    return this.prisma.rssItem.create({
      data,
    });
  }

  async markRssItemProcessed(guid: string): Promise<any> {
    return this.prisma.rssItem.update({
      where: { guid },
      data: { processed: true },
    });
  }

  async getUnprocessedRssItems(): Promise<any[]> {
    return this.prisma.rssItem.findMany({
      where: { processed: false },
      orderBy: { pubDate: 'desc' },
    });
  }

  // Publish logs methods
  async createPublishLog(data: {
    postId?: string;
    status: string;
    message?: string;
    error?: string;
  }): Promise<any> {
    return this.prisma.publishLog.create({
      data,
    });
  }

  async getRecentPublishLogs(limit = 100): Promise<any[]> {
    return this.prisma.publishLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // Utility methods
  async getStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    draftPosts: number;
  }> {
    const [totalPosts, publishedPosts, scheduledPosts, draftPosts] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: 'published' } }),
      this.prisma.post.count({ where: { status: 'scheduled' } }),
      this.prisma.post.count({ where: { status: 'draft' } }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts,
    };
  }

  // LinkedIn Token methods
  async storeLinkedInToken(data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    scope?: string;
    linkedInUserId?: string;
  }): Promise<any> {
    try {
      console.log('🗑️  Deleting old tokens...');
      // Delete existing tokens first
      await this.prisma.linkedInToken.deleteMany({});
      console.log('✅ Old tokens deleted');
      
      console.log('📝 Creating new token record...');
      const result = await this.prisma.linkedInToken.create({
        data: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || null,
          expiresAt: data.expiresAt,
          scope: data.scope || null,
          linkedInUserId: data.linkedInUserId || null,
        },
      });
      
      console.log('✅ Token record created with ID:', result.id);
      if (data.linkedInUserId) {
        console.log('✅ Stored LinkedIn User ID:', data.linkedInUserId);
      }
      return result;
    } catch (error: any) {
      console.error('❌ Error storing LinkedIn token:', error.message);
      throw error;
    }
  }

  async getValidLinkedInToken(): Promise<{
    accessToken: string;
    refreshToken: string | undefined;
    expiresAt: Date;
    scope: string | undefined;
  } | null> {
    console.log('💾 getValidLinkedInToken: Querying database...');
    const token = await this.prisma.linkedInToken.findFirst({
      where: {
        expiresAt: {
          gt: new Date(), // Token hasn't expired yet
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!token) {
      console.log('💾 getValidLinkedInToken: No valid token found in database');
      return null;
    }

    console.log('💾 getValidLinkedInToken: Found token, expires:', token.expiresAt);
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ? token.refreshToken : undefined,
      expiresAt: token.expiresAt,
      scope: token.scope ? token.scope : undefined,
    };
  }

  async getLatestLinkedInToken(): Promise<{
    accessToken: string;
    refreshToken: string | undefined;
    expiresAt: Date;
    scope: string | undefined;
    linkedInUserId: string | undefined;
  } | null> {
    const token = await this.prisma.linkedInToken.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!token) {
      return null;
    }

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ? token.refreshToken : undefined,
      expiresAt: token.expiresAt,
      scope: token.scope ? token.scope : undefined,
      linkedInUserId: token.linkedInUserId ? token.linkedInUserId : undefined,
    };
  }

  // Get Prisma client for advanced queries
  getClient(): PrismaClient {
    return this.prisma;
  }
}

export default new DatabaseService();