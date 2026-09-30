import mongoose, { Schema, Document } from 'mongoose';

export interface ITrainAvailability extends Document {
  trainNumber: string;
  journeyDate: string;
  source: string;
  destination: string;
  classType: string;
  availableSeats: number;
  statusText?: string;
  fare: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrainAvailabilitySchema = new Schema<ITrainAvailability>(
  {
    trainNumber: { type: String, required: true, index: true },
    journeyDate: { type: String, required: true, index: true },
    source: { type: String, required: true },
    destination: { type: String, required: true },
    classType: { type: String, required: true },
    availableSeats: { type: Number, required: true },
    statusText: { type: String },
    fare: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

TrainAvailabilitySchema.index({ trainNumber: 1, journeyDate: 1, classType: 1 });

export const TrainAvailability = mongoose.model<ITrainAvailability>(
  'TrainAvailability',
  TrainAvailabilitySchema
);
