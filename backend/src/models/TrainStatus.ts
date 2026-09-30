import mongoose, { Schema, Document } from 'mongoose';

export type TrainStatusCode = 'ON_TIME' | 'DELAYED' | 'ARRIVED' | 'DEPARTED' | 'CANCELLED';

export interface ITrainStatus extends Document {
  trainNumber: string;
  currentStation: string;
  nextStation: string;
  latitude: number;
  longitude: number;
  speed: number;
  delayMinutes: number;
  scheduledArrival: string;
  expectedArrival: string;
  status: TrainStatusCode;
  lastUpdated: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainStatusSchema = new Schema<ITrainStatus>(
  {
    trainNumber: { type: String, required: true, index: true },
    currentStation: { type: String, required: true },
    nextStation: { type: String, required: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    delayMinutes: { type: Number, default: 0 },
    scheduledArrival: { type: String, required: true },
    expectedArrival: { type: String, required: true },
    status: {
      type: String,
      enum: ['ON_TIME', 'DELAYED', 'ARRIVED', 'DEPARTED', 'CANCELLED'],
      default: 'ON_TIME',
    },
    lastUpdated: { type: String, default: 'Just now' },
  },
  {
    timestamps: true,
  }
);

export const TrainStatus = mongoose.model<ITrainStatus>('TrainStatus', TrainStatusSchema);
