import { Router } from 'express';
import healthRoutes from './health.routes.js';
import trainRoutes from './train.routes.js';
import trainStatusRoutes from './trainStatus.routes.js';
import availabilityRoutes from './availability.routes.js';
import routeRoutes from './route.routes.js';
import journeyPlannerRoutes from './journeyPlanner.routes.js';
import { getTrainETA } from '../controllers/trainStatus.controller.js';
import { getModelStatus } from '../controllers/modelStatus.controller.js';
import { getDataProviderStatus, verifyDataProvider } from '../controllers/dataProvider.controller.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/trains', trainRoutes);
router.use('/train-status', trainStatusRoutes);
router.use('/live-trains', trainStatusRoutes);
router.get('/train-eta/model-status', getModelStatus);
router.get('/train-eta/:trainNumber', getTrainETA);
router.get('/data-provider/status', getDataProviderStatus);
router.get('/data-provider/verify', verifyDataProvider);
router.use('/availability', availabilityRoutes);
router.use('/routes', routeRoutes);
router.use('/journey-planner', journeyPlannerRoutes);

export default router;



