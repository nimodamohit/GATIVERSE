import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Train } from '../models/Train.js';
import { TrainStatus } from '../models/TrainStatus.js';
import { Route } from '../models/Route.js';
import { TrainAvailability } from '../models/TrainAvailability.js';
import { FALLBACK_DEMO_TRAINS } from '../services/train.service.js';
import { FALLBACK_DEMO_STATUSES } from '../services/trainStatus.service.js';
import { FALLBACK_DEMO_AVAILABILITY } from '../services/availability.service.js';
import { FALLBACK_DEMO_ROUTES } from '../services/route.service.js';
import { logger } from '../utils/logger.js';

export const seedDatabase = async (): Promise<void> => {
  const connected = await connectDB();
  if (!connected) {
    logger.error('MongoDB not connected. Seed script requires an active MONGODB_URI.');
    process.exit(1);
  }

  logger.info('Starting GATIVERSE database seed process (upsert mode)...');

  try {
    // 1. Seed Trains
    for (const trainData of FALLBACK_DEMO_TRAINS) {
      await Train.findOneAndUpdate(
        { trainNumber: trainData.trainNumber },
        { $set: trainData },
        { upsert: true, new: true }
      );
      logger.info(`Seeded Train: ${trainData.trainNumber} - ${trainData.trainName}`);
    }

    // 2. Seed Train Statuses
    for (const [trainNumber, statusData] of Object.entries(FALLBACK_DEMO_STATUSES)) {
      await TrainStatus.findOneAndUpdate(
        { trainNumber },
        { $set: statusData },
        { upsert: true, new: true }
      );
      logger.info(`Seeded Status for Train: ${trainNumber}`);
    }

    // 3. Seed Routes
    for (const routeData of FALLBACK_DEMO_ROUTES) {
      await Route.findOneAndUpdate(
        { routeKey: routeData.routeKey },
        { $set: routeData },
        { upsert: true, new: true }
      );
      logger.info(`Seeded Route: ${routeData.routeKey} (${routeData.source} → ${routeData.destination})`);
    }

    // 4. Seed Train Availability
    for (const availData of FALLBACK_DEMO_AVAILABILITY) {
      await TrainAvailability.findOneAndUpdate(
        {
          trainNumber: availData.trainNumber,
          journeyDate: availData.journeyDate,
          classType: availData.classType,
        },
        { $set: availData },
        { upsert: true, new: true }
      );
      logger.info(
        `Seeded Availability: Train ${availData.trainNumber} [${availData.classType}] on ${availData.journeyDate}`
      );
    }

    logger.info('✅ Database seed completed successfully!');
  } catch (error) {
    logger.error('Error during database seed process:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed after seeding.');
  }
};

if (process.argv[1]?.includes('seed')) {
  seedDatabase().catch((err) => {
    logger.error('Seed execution error:', err);
    process.exit(1);
  });
}
