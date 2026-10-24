import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './request.controller.js';
import { etaRequest, listRecentSearchesRequest, promocodeListRequest, saveRecentSearchRequest } from './request.validation.js';
import { createBookingRequest } from '../booking/booking.validation.js';

const router = Router();

router.post('/eta', authenticate, validate(etaRequest), controller.eta);
router.post('/create', authenticate, validate(createBookingRequest), controller.createBooking);
router.get('/promocode-list', authenticate, validate(promocodeListRequest), controller.promocodeList);
router.get('/list-recent-searches', authenticate, validate(listRecentSearchesRequest), controller.listRecentSearches);
router.post('/save-recent-search', authenticate, validate(saveRecentSearchRequest), controller.saveRecentSearch);

export default router;
