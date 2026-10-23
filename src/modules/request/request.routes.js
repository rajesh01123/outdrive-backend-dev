import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './request.controller.js';
import { etaRequest } from './request.validation.js';

const router = Router();

router.post('/eta', authenticate, validate(etaRequest), controller.eta);

export default router;
