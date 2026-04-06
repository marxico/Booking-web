const logger = require('./server/utils/logger');
const { startServer } = require('./server/app');

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack
  });
});

process.on('unhandledRejection', (reason) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const errorStack = reason instanceof Error ? reason.stack : '';

  logger.error('Unhandled promise rejection', {
    message: errorMessage,
    stack: errorStack
  });
});

startServer();
