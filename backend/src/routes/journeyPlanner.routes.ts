import { Router } from 'express';
import { searchJourneyPlanner } from '../controllers/journeyPlanner.controller.js';

const router = Router();

router.get('/search', searchJourneyPlanner);
router.get('/', searchJourneyPlanner);

export default router;
