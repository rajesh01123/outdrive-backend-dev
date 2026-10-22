import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { profileUpload } from '../../shared/utils/profile-upload.js';
import * as controller from './user.controller.js';
import { deleteAccountRequest, updateProfileRequest } from './user.validation.js';

const router = Router();

router.get('/', authenticate, controller.getUser);
router.post('/profile', authenticate, profileUpload.single('profile_picture'), validate(updateProfileRequest), controller.updateProfile);
router.post('/delete-account', authenticate, validate(deleteAccountRequest), controller.deleteAccount);

export default router;
