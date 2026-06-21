const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

async function start() {
  await connectDB();
  const server = app.listen(env.port, () => {
    console.log(`🚀 StaffFlow API running on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
