import { RailwayDataProvider } from './interfaces/RailwayDataProvider.js';
import { SimulatorRailwayDataProvider } from './simulator/SimulatorRailwayDataProvider.js';
import { RealRailwayDataProvider } from './real/RealRailwayDataProvider.js';
import { RailKitDataProvider } from './railkit/RailKitDataProvider.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export * from './interfaces/RailwayDataProvider.js';
export * from './simulator/SimulatorRailwayDataProvider.js';
export * from './real/RealRailwayDataProvider.js';
export * from './real/RailwayApiClient.js';
export { RailKitDataProvider } from './railkit/RailKitDataProvider.js';

const mode = (config.railwayDataProvider || 'simulator').toLowerCase().trim();

let activeProvider: RailwayDataProvider;

if (mode === 'railkit') {
  logger.info('Initializing RailKitDataProvider (RailKit V2 mode) for GATIVERSE...');
  activeProvider = new RailKitDataProvider();
} else if (mode === 'real') {
  logger.info('Initializing RealRailwayDataProvider mode for GATIVERSE...');
  activeProvider = new RealRailwayDataProvider();
} else {
  logger.info('Initializing SimulatorRailwayDataProvider (default demo mode) for GATIVERSE...');
  activeProvider = new SimulatorRailwayDataProvider();
}

export const railwayDataProvider: RailwayDataProvider = activeProvider;

