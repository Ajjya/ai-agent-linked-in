import App from './app';

const app = new App();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await app.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});