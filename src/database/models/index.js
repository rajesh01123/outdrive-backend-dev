import { User } from './user.model.js';
import { OtpVerification } from './otp-verification.model.js';
import { UserSession } from './user-session.model.js';
import { Device } from './device.model.js';
import { Admin } from './admin.model.js';
import { Driver } from './driver.model.js';
import { AdminSession } from './admin-session.model.js';
import { AdminOtpVerification } from './admin-otp-verification.model.js';
import { Service } from './service.model.js';

User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Device, { foreignKey: 'userId', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Admin.hasMany(AdminSession, { foreignKey: 'adminId', as: 'sessions' });
AdminSession.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });
Admin.hasMany(AdminOtpVerification, { foreignKey: 'adminId', as: 'otpVerifications' });
AdminOtpVerification.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

export { User, OtpVerification, UserSession, Device, Admin, Driver, AdminSession, AdminOtpVerification, Service };
