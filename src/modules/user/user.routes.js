import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { profileUpload } from '../../shared/utils/profile-upload.js';
import * as controller from './user.controller.js';
import { addFavouriteRequest, deleteAccountRequest, deleteFavouriteRequest, getUserRequest, updateProfileRequest } from './user.validation.js';

const router = Router();

router.get('/', authenticate, validate(getUserRequest), controller.getUser);
router.post('/profile', authenticate, profileUpload.single('profile_picture'), validate(updateProfileRequest), controller.updateProfile);
router.post('/delete-account', authenticate, validate(deleteAccountRequest), controller.deleteAccount);
router.post('/add-favourite-location', authenticate, validate(addFavouriteRequest), controller.addFavourite);
router.delete('/favourite-location/:id', authenticate, validate(deleteFavouriteRequest), controller.deleteFavourite);
// Older app builds delete with a POST body instead of DELETE.
router.post('/delete-favourite-location', authenticate, validate(deleteFavouriteRequest), controller.deleteFavourite);

export default router;
