import mongoose from 'mongoose';
import { config } from '../config';

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

export async function connectDB(): Promise<void> {
  let attempt = 1;
  const dbUri = config.MONGODB_URI;

  const options = {
    autoIndex: true,
  };

  while (attempt <= MAX_RETRIES) {
    try {
      console.log(`Connecting to MongoDB (Attempt ${attempt}/${MAX_RETRIES})...`);
      await mongoose.connect(dbUri, options);
      console.log('MongoDB connected successfully.');
      return;
    } catch (error) {
      console.error(`MongoDB connection failed (Attempt ${attempt}/${MAX_RETRIES}):`, error);
      attempt++;
      if (attempt <= MAX_RETRIES) {
        console.log(`Retrying connection in ${RETRY_INTERVAL / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  }

  console.error('All MongoDB connection attempts failed. Proceeding without an active DB connection (APIs may fail).');
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  } catch (error) {
    console.error('Error during MongoDB disconnect:', error);
  }
}
