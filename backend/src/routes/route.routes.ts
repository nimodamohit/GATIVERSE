import { Router } from 'express';
import { getRoutes } from '../controllers/route.controller.js';

const router = Router();

router.get('/', getRoutes);

export default router;
