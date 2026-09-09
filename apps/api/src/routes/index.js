import { Router } from 'express';
import healthCheck from './health-check.js';
import portal from './portal.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/api/portal', portal);

    return router;
};
