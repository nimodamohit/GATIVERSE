import { Router } from 'express';
import { getTrainStatus, getAllLiveTrains } from '../controllers/trainStatus.controller.js';

const router = Router();

router.get('/', getAllLiveTrains);
router.get('/:trainNumber', getTrainStatus);

export default router;

