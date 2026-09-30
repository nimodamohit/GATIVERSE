import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async (): Promise<boolean> => {
  if (!config.mongodbUri) {
    logger.warn('MONGODB_URI is not defined in environment variables. Continuing in offline mode...');
    return false;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    logger.warn('Continuing without active MongoDB connection...');
    return false;
  }
};

export const isDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

