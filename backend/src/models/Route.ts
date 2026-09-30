import mongoose, { Schema, Document } from 'mongoose';

export interface IRoute extends Document {
  source: string;
  destination: string;
  routeKey: string;
  distance: number;
  estimatedDuration: string;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    source: { type: String, required: true },
    destination: { type: String, required: true },
    routeKey: { type: String, required: true, unique: true, index: true },
    distance: { type: Number, required: true },
    estimatedDuration: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Route = mongoose.model<IRoute>('Route', RouteSchema);
