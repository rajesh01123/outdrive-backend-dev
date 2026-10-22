import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { storedProfilePath } from '../../shared/utils/profile-upload.js';
import * as userService from './user.service.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile({
    userId: req.auth.userId,
    body: req.body,
    profilePicture: storedProfilePath(req.file)
  });
  return success(res, { message: 'profile_updated', data: { user } });
});

export const getUser = asyncHandler(async (req, res) => {
  const data = await userService.getUser(req.auth.userId);
  return success(res, { message: 'OK', data });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteAccount({ userId: req.auth.userId, otp: req.body.otp, reason: req.body.reason });
  return success(res, { message: 'account_deleted' });
});
