import mongoose from 'mongoose';
import { config } from './config';

export const connectDB = async (): Promise<void> => {
  const uri = config.MONGODB_URL;

  if (!uri) {
    console.error('MONGODB_URL is not defined in config');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB connected Successfully`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${(error as Error).message}`);
    process.exit(1);
  }
};

// Graceful disconnect
export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
};
