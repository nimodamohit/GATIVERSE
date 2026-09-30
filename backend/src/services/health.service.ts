import { isDbConnected } from '../config/db.js';

export interface HealthStatus {
  status: string;
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export const getHealthStatus = (): HealthStatus => {
  return {
    status: 'ok',
    service: 'GATIVERSE Backend',
    database: isDbConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
};
