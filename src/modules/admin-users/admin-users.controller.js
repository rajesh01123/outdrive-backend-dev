import { success } from '../../shared/responses/api-response.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import * as adminUsersService from './admin-users.service.js';

export const stats = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { stats: await adminUsersService.getUserStats() } })
);

export const list = asyncHandler(async (req, res) => {
  const data = await adminUsersService.listUsers(req.query);
  return success(res, { message: 'OK', data });
});

export const show = asyncHandler(async (req, res) =>
  success(res, { message: 'OK', data: { user: await adminUsersService.getUser(req.params.id) } })
);

export const update = asyncHandler(async (req, res) => {
  const user = await adminUsersService.updateUser({ id: req.params.id, body: req.body });
  return success(res, { message: 'user_updated', data: { user } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const user = await adminUsersService.updateUserStatus({ id: req.params.id, status: req.body.status });
  return success(res, { message: 'user_status_updated', data: { user } });
});

export const destroy = asyncHandler(async (req, res) => {
  await adminUsersService.deleteUser({ id: req.params.id, reason: req.body.reason });
  return success(res, { message: 'user_deleted' });
});
