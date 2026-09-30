import mongoose, { Schema, Document } from 'mongoose';

export interface IStationStop {
  stopNumber: number;
  stationCode: string;
  stationName: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  platform?: string;
  status?: 'passed' | 'current' | 'upcoming';
}

export interface ITrainClass {
  classCode: string;
  className: string;
  fare: number;
}

export interface ITrain extends Document {
  trainNumber: string;
  trainName: string;
  source: string;
  destination: string;
  sourceCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  runningDays: string[];
  stations: IStationStop[];
  classes: ITrainClass[];
  createdAt: Date;
  updatedAt: Date;
}

const StationStopSchema = new Schema<IStationStop>({
  stopNumber: { type: Number, required: true },
  stationCode: { type: String, required: true },
  stationName: { type: String, required: true },
  scheduledArrival: { type: String, required: true },
  scheduledDeparture: { type: String, required: true },
  actualArrival: { type: String },
  actualDeparture: { type: String },
  platform: { type: String },
  status: { type: String, enum: ['passed', 'current', 'upcoming'], default: 'upcoming' },
});

const TrainClassSchema = new Schema<ITrainClass>({
  classCode: { type: String, required: true },
  className: { type: String, required: true },
  fare: { type: Number, required: true },
});

const TrainSchema = new Schema<ITrain>(
  {
    trainNumber: { type: String, required: true, unique: true, index: true },
    trainName: { type: String, required: true },
    source: { type: String, required: true },
    destination: { type: String, required: true },
    sourceCode: { type: String, required: true },
    destinationCode: { type: String, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    duration: { type: String, required: true },
    runningDays: { type: [String], default: [] },
    stations: { type: [StationStopSchema], default: [] },
    classes: { type: [TrainClassSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const Train = mongoose.model<ITrain>('Train', TrainSchema);
