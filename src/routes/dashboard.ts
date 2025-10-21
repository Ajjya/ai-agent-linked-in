import { Router } from 'express';
import databaseService from '../services/database';

const router = Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await databaseService.getStats();
    const recentLogs = await databaseService.getRecentPublishLogs(10);

    res.json({
      success: true,
      data: {
        ...stats,
        recentActivity: recentLogs,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    });
  }
});

// Get recent publish logs
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await databaseService.getRecentPublishLogs(limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

export default router;