import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './request.controller.js';
import { etaRequest, listRecentSearchesRequest, saveRecentSearchRequest } from './request.validation.js';

const router = Router();

router.post('/eta', authenticate, validate(etaRequest), controller.eta);
router.get('/list-recent-searches', authenticate, validate(listRecentSearchesRequest), controller.listRecentSearches);
router.post('/save-recent-search', authenticate, validate(saveRecentSearchRequest), controller.saveRecentSearch);

export default router;
