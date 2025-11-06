import { Router } from 'express';
import schedulerService from '../services/scheduler';
import rssService from '../services/rss';
import linkedinService from '../services/linkedin';
import config from '../config';

const router = Router();

// Get scheduler status
router.get('/status', async (req, res) => {
  try {
    const status = schedulerService.getSchedulerStatus();
    const nextSchedule = schedulerService.getNextPostingSchedule();

    res.json({
      success: true,
      data: {
        ...status,
        nextPostingDates: nextSchedule,
      },
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
    });
  }
});

// Debug config endpoint
router.get('/debug/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        nodeEnv: config.nodeEnv,
        linkedin: {
          clientId: config.linkedin.clientId ? `${config.linkedin.clientId.substring(0, 5)}...` : 'empty',
          clientSecret: config.linkedin.clientSecret ? 'set' : 'empty',
          redirectUri: config.linkedin.redirectUri,
          accessToken: config.linkedin.accessToken ? 'set' : 'empty',
        },
        envVars: {
          LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? `${process.env.LINKEDIN_CLIENT_ID.substring(0, 5)}...` : 'empty',
          LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ? 'set' : 'empty',
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get debug config',
    });
  }
});

// Trigger manual RSS fetch
router.post('/rss/fetch', async (req, res) => {
  try {
    console.log('\n📍 POST /api/system/rss/fetch endpoint called');
    console.log('🔄 Calling schedulerService.triggerRSSFetch()...');
    
    // Don't wait for the async operation to complete, respond immediately
    schedulerService.triggerRSSFetch().then(() => {
      console.log('✅ triggerRSSFetch() background task completed');
    }).catch(err => {
      console.error('❌ Error in background RSS fetch task:', err);
    });
    
    res.json({
      success: true,
      message: 'RSS fetch triggered successfully',
    });
  } catch (error) {
    console.error('❌ Error triggering RSS fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger RSS fetch',
    });
  }
});

// Trigger manual post publishing
router.post('/posts/publish', async (req, res) => {
  try {
    await schedulerService.triggerPostPublishing();
    res.json({
      success: true,
      message: 'Post publishing triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering post publishing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger post publishing',
    });
  }
});

// Schedule post for immediate publishing
router.post('/posts/:id/publish-now', async (req, res) => {
  try {
    const { id } = req.params;
    await schedulerService.scheduleImmediate(id);
    res.json({
      success: true,
      message: 'Post scheduled for immediate publishing',
    });
  } catch (error) {
    console.error('Error scheduling immediate post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule post for immediate publishing',
    });
  }
});

// Get RSS content summary
router.get('/rss/summary', async (req, res) => {
  try {
    const summary = await rssService.generateContentSummary();
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting RSS summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RSS summary',
    });
  }
});

// Test LinkedIn connection
router.get('/linkedin/test', async (req, res) => {
  try {
    console.log('📍 /linkedin/test endpoint called');
    const result = await linkedinService.testConnection();
    res.json({
      success: result.success,
      data: result.profile,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Error testing LinkedIn connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test LinkedIn connection',
    });
  }
});

export default router;