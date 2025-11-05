import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config';
import databaseService from './services/database';
import schedulerService from './services/scheduler';

// Import routes
import postsRouter from './routes/posts';
import systemRouter from './routes/system';
import dashboardRouter from './routes/dashboard';
import authRouter from './routes/auth';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for simple HTML pages
    }));
    
    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(path.join(__dirname, 'views')));
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/posts', postsRouter);
    this.app.use('/api/system', systemRouter);
    this.app.use('/api/dashboard', dashboardRouter);
    this.app.use('/auth', authRouter);

    // Web panel routes
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'index.html'));
    });

    this.app.get('/posts', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'posts.html'));
    });

    this.app.get('/schedule', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'schedule.html'));
    });

    this.app.get('/settings', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'settings.html'));
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    });
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting LinkedIn MongoDB Agent...');

      // Initialize database
      await databaseService.connect();

      // Initialize LinkedIn token from database
      const linkedinService = await import('./services/linkedin');
      await linkedinService.default.initializeToken();

      // Initialize scheduler (includes token refresh)
      await schedulerService.initialize();

      console.log('✅ Application initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    await this.initialize();

    const port = config.port;
    this.app.listen(port, () => {
      console.log(`🌐 Server running on http://localhost:${port}`);
      console.log(`📊 Dashboard available at http://localhost:${port}`);
      console.log(`🔧 Environment: ${config.nodeEnv}`);
    });
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down application...');
    
    try {
      await schedulerService.stop();
      await databaseService.disconnect();
      console.log('✅ Application shut down successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

export default App;