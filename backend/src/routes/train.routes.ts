import { Router } from 'express';
import {
  getTrains,
  getTrainByNumber,
  searchTrainsController,
  searchStationsController,
  getSeatAvailabilityController,
  getTrainFareController,
} from '../controllers/train.controller.js';

const router = Router();

router.get('/search', searchTrainsController);
router.get('/stations/search', searchStationsController);
router.get('/:trainNumber/availability', getSeatAvailabilityController);
router.get('/:trainNumber/fare', getTrainFareController);
router.get('/', getTrains);
router.get('/:trainNumber', getTrainByNumber);

export default router;


