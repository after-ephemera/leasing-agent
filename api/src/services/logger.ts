import winston from 'winston';
import { Database } from '../database';
import { LogEntry } from '../types';

export class Logger {
  private winston: winston.Logger;
  
  constructor(private db: Database) {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'leasing-assistant' },
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.winston.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  async logRequest(entry: LogEntry): Promise<void> {
    // Log to Winston
    this.winston.info('Request processed', entry);

    // Log to database
    try {
      const query = `
        INSERT INTO logs (
          request_id, tool_name, tool_args, tool_response, 
          llm_latency, llm_tokens_prompt, llm_tokens_completion, llm_tokens_total, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      const params = [
        entry.request_id,
        entry.tool_name || null,
        entry.tool_args ? JSON.stringify(entry.tool_args) : null,
        entry.tool_response ? JSON.stringify(entry.tool_response) : null,
        entry.llm_latency || null,
        entry.llm_tokens?.prompt || null,
        entry.llm_tokens?.completion || null,
        entry.llm_tokens?.total || null,
        entry.error || null
      ];

      await this.db.query(query, params);
    } catch (err) {
      this.winston.error('Failed to log to database:', err);
      throw err;
    }
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }
}
