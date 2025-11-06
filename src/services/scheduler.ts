import * as cron from 'node-cron';
import config from '../config';
import databaseService from './database';
import linkedinService from './linkedin';
import rssService from './rss';

class SchedulerService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  async initialize(): Promise<void> {
    console.log('🕐 Initializing scheduler service...');

    // Setup RSS fetching - every 6 hours
    this.setupRSSFetching();

    // Setup post publishing - based on configured schedule
    this.setupPostPublishing();

    // Setup cleanup tasks - daily at midnight
    this.setupCleanupTasks();

    // Setup token refresh - check every 30 minutes
    this.setupTokenRefresh();

    this.isRunning = true;
    console.log('✅ Scheduler service initialized');
  }

  private setupRSSFetching(): void {
    // Fetch RSS every 6 hours
    const rssJob = cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('📡 Starting scheduled RSS fetch...');
        await rssService.fetchAndProcessRSS();
      } catch (error) {
        console.error('❌ Error in scheduled RSS fetch:', error);
        await databaseService.createPublishLog({
          status: 'error',
          message: 'RSS fetch failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, {
      timezone: config.posting.timezone,
    });

    this.cronJobs.set('rss-fetch', rssJob);
    console.log('✅ RSS fetching scheduled (every 6 hours)');
  }

  private setupPostPublishing(): void {
    const { days, time, timezone } = config.posting;
    const [hour, minute] = time.split(':').map(Number);

    // Convert posting days to cron format
    const cronDays = days.join(',');
    const cronExpression = `${minute} ${hour} * * ${cronDays}`;

    const publishJob = cron.schedule(cronExpression, async () => {
      try {
        console.log('📝 Starting scheduled post publishing...');
        await this.processScheduledPosts();
      } catch (error) {
        console.error('❌ Error in scheduled post publishing:', error);
        await databaseService.createPublishLog({
          status: 'error',
          message: 'Scheduled post publishing failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, {
      timezone,
    });

    this.cronJobs.set('post-publish', publishJob);
    console.log(`✅ Post publishing scheduled (${time} on days: ${days.join(', ')}, timezone: ${timezone})`);
  }

  private setupCleanupTasks(): void {
    // Cleanup old logs and RSS items daily at midnight
    const cleanupJob = cron.schedule('0 0 * * *', async () => {
      try {
        console.log('🧹 Starting scheduled cleanup...');
        await this.performCleanup();
      } catch (error) {
        console.error('❌ Error in scheduled cleanup:', error);
      }
    }, {
      timezone: config.posting.timezone,
    });

    this.cronJobs.set('cleanup', cleanupJob);
    console.log('✅ Cleanup tasks scheduled (daily at midnight)');
  }

  private setupTokenRefresh(): void {
    // Check and refresh LinkedIn token every 30 minutes
    const tokenRefreshJob = cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('🔐 Checking LinkedIn token expiration...');
        await linkedinService.checkAndRefreshToken();
      } catch (error) {
        console.error('❌ Error checking/refreshing LinkedIn token:', error);
        await databaseService.createPublishLog({
          status: 'error',
          message: 'Token refresh failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, {
      timezone: config.posting.timezone,
    });

    this.cronJobs.set('token-refresh', tokenRefreshJob);
    console.log('✅ Token refresh scheduled (every 30 minutes)');
  }

  async processScheduledPosts(): Promise<void> {
    console.log('📋 processScheduledPosts: Starting...');
    const scheduledPosts = await databaseService.getScheduledPosts();
    console.log(`📋 processScheduledPosts: Found ${scheduledPosts.length} posts in database`);
    
    if (scheduledPosts.length === 0) {
      console.log('📭 No posts scheduled for publishing');
      return;
    }

    console.log(`📮 Found ${scheduledPosts.length} posts scheduled for publishing`);

    for (const post of scheduledPosts) {
      try {
        // Validate LinkedIn connection before posting
        console.log(`🔍 Validating LinkedIn connection for post: ${post.title}`);
        const isConnected = await linkedinService.validateConnection();
        console.log(`✅ Connection validation result: ${isConnected}`);
        if (!isConnected) {
          console.error('❌ LinkedIn connection invalid, skipping post publishing');
          await databaseService.createPublishLog({
            postId: post.id,
            status: 'error',
            message: 'LinkedIn connection invalid',
          });
          continue;
        }

        // Publish to LinkedIn
        await linkedinService.createPost({
          id: post.id,
          title: post.title,
          content: post.content,
          imageUrl: post.imageUrl,
        });

        console.log(`✅ Successfully published post: ${post.title}`);
      } catch (error) {
        console.error(`❌ Failed to publish post: ${post.title}`, error);
        // Error logging is handled in LinkedIn service
      }

      // Add delay between posts to avoid rate limiting
      if (scheduledPosts.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async performCleanup(): Promise<void> {
    const client = databaseService.getClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Delete old publish logs (older than 30 days)
      const deletedLogs = await client.publishLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Delete old RSS items (older than 30 days)
      const deletedRssItems = await client.rssItem.deleteMany({
        where: {
          pubDate: {
            lt: thirtyDaysAgo,
          },
        },
      });

      console.log(`🧹 Cleanup completed: removed ${deletedLogs.count} old logs and ${deletedRssItems.count} old RSS items`);
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Manual triggers for testing and immediate actions
  async triggerRSSFetch(): Promise<void> {
    console.log('🔄 Manual RSS fetch triggered...');
    await rssService.fetchAndProcessRSS();
  }

  async triggerPostPublishing(): Promise<void> {
    console.log('🔄 Manual post publishing triggered...');
    console.log('🔄 About to call processScheduledPosts()...');
    try {
      await this.processScheduledPosts();
      console.log('🔄 processScheduledPosts() completed');
    } catch (error) {
      console.error('🔄 Error in processScheduledPosts():', error);
      throw error;
    }
  }

  async scheduleImmediate(postId: string): Promise<void> {
    const post = await databaseService.getPostById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Update post to be scheduled for immediate publishing
    await databaseService.updatePostStatus(postId, 'scheduled');
    
    // Set scheduled time to now
    const now = new Date();
    await databaseService.getClient().post.update({
      where: { id: postId },
      data: { scheduledAt: now },
    });

    console.log(`📅 Post scheduled for immediate publishing: ${post.title}`);
  }

  // Get scheduler status and next run times
  getSchedulerStatus(): {
    isRunning: boolean;
    jobs: Array<{
      name: string;
      status: string;
    }>;
  } {
    const jobs = Array.from(this.cronJobs.entries()).map(([name]) => ({
      name,
      status: 'active',
    }));

    return {
      isRunning: this.isRunning,
      jobs,
    };
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping scheduler service...');
    
    for (const [name, job] of this.cronJobs.entries()) {
      job.stop();
      console.log(`⏹️ Stopped job: ${name}`);
    }

    this.cronJobs.clear();
    this.isRunning = false;
    console.log('✅ Scheduler service stopped');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.initialize();
  }

  // Get next posting schedule
  getNextPostingSchedule(): Array<{
    date: Date;
    dayName: string;
  }> {
    const { days, time, timezone } = config.posting;
    const timeParts = time.split(':').map(Number);
    const hour = timeParts[0] || 10;
    const minute = timeParts[1] || 30;
    const now = new Date();
    const schedule: Array<{ date: Date; dayName: string }> = [];

    // Get next 4 posting dates
    for (let i = 0; i < 14; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      
      if (days.includes(date.getDay())) {
        const postingDate = new Date(date);
        postingDate.setHours(hour, minute, 0, 0);
        
        // Only include future dates
        if (postingDate > now) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          schedule.push({
            date: postingDate,
            dayName: dayNames[date.getDay()] || 'Unknown',
          });
        }

        if (schedule.length >= 4) break;
      }
    }

    return schedule;
  }
}

export default new SchedulerService();