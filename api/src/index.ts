import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Database } from './database';
import { LeasingTools } from './tools/langchain-tools';
import { Logger } from './services/logger';
import { LangChainAgent } from './services/langchain-agent';
import { createChatRouter } from './routes/chat';
import { mkdirSync } from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'], // Vite default port
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create logs directory
mkdirSync('logs', { recursive: true });

// Initialize services
const database = new Database(process.env.DATABASE_URL);
const leasingTools = new LeasingTools(database);
const logger = new Logger(database);
const langChainAgent = new LangChainAgent(leasingTools, logger);

// Routes
app.use('/api', createChatRouter(langChainAgent, leasingTools));

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Leasing Assistant API running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🗄️  Database: ${process.env.DATABASE_URL || 'postgresql://localhost/leasing_assistant'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

export default app;
