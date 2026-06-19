import { config } from './config';
import { createApp } from './app';
import { logger } from './utils/logger';
import { excelService } from './services/excel.service';

async function bootstrap() {
  // Validate Excel file exists and is readable before accepting traffic
  try {
    await excelService.loadRows();
  } catch (err) {
    logger.error('Failed to load Excel data on startup', { err });
    logger.warn('Server will still start — first request will retry loading.');
  }

  const app = createApp();
  const { port, nodeEnv } = config.server;

  app.listen(port, () => {
    logger.info(`Bench Buddy AI backend running on port ${port} [${nodeEnv}]`);
    logger.info(`POST http://localhost:${port}/api/chat`);
  });
}

// Graceful unhandled rejection handling
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
