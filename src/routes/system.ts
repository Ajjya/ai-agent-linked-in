import { Router } from 'express';
import schedulerService from '../services/scheduler';
import rssService from '../services/rss';
import linkedinService from '../services/linkedin';

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

// Trigger manual RSS fetch
router.post('/rss/fetch', async (req, res) => {
  try {
    await schedulerService.triggerRSSFetch();
    res.json({
      success: true,
      message: 'RSS fetch triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering RSS fetch:', error);
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
    const result = await linkedinService.testConnection();
    res.json({
      success: result.success,
      data: result.profile,
      error: result.error,
    });
  } catch (error) {
    console.error('Error testing LinkedIn connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test LinkedIn connection',
    });
  }
});

export default router;