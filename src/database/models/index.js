import { User } from './user.model.js';
import { OtpVerification } from './otp-verification.model.js';
import { UserSession } from './user-session.model.js';
import { Device } from './device.model.js';
import { Admin } from './admin.model.js';
import { Driver } from './driver.model.js';
import { AdminSession } from './admin-session.model.js';
import { AdminOtpVerification } from './admin-otp-verification.model.js';
import { Service } from './service.model.js';
import { Zone } from './zone.model.js';
import { ZoneService } from './zone-service.model.js';
import { VehicleType } from './vehicle-type.model.js';
import { ServiceVehicleType } from './service-vehicle-type.model.js';
import { ZoneVehicleFare } from './zone-vehicle-fare.model.js';
import { FareHistory } from './fare-history.model.js';
import { Booking } from './booking.model.js';
import { BookingParcel } from './booking-parcel.model.js';

User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Device, { foreignKey: 'userId', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Admin.hasMany(AdminSession, { foreignKey: 'adminId', as: 'sessions' });
AdminSession.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });
Admin.hasMany(AdminOtpVerification, { foreignKey: 'adminId', as: 'otpVerifications' });
AdminOtpVerification.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

Zone.hasMany(ZoneService, { foreignKey: 'zoneId', as: 'zoneServices' });
ZoneService.belongsTo(Zone, { foreignKey: 'zoneId', as: 'zone' });
ZoneService.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Service.hasMany(ZoneService, { foreignKey: 'serviceId', as: 'zoneServices' });

Service.belongsToMany(VehicleType, { through: ServiceVehicleType, foreignKey: 'serviceId', otherKey: 'vehicleTypeId', as: 'vehicleTypes' });
VehicleType.belongsToMany(Service, { through: ServiceVehicleType, foreignKey: 'vehicleTypeId', otherKey: 'serviceId', as: 'services' });

Zone.hasMany(ZoneVehicleFare, { foreignKey: 'zoneId', as: 'fares' });
ZoneVehicleFare.belongsTo(Zone, { foreignKey: 'zoneId', as: 'zone' });
ZoneVehicleFare.belongsTo(VehicleType, { foreignKey: 'vehicleTypeId', as: 'vehicleType' });
VehicleType.hasMany(ZoneVehicleFare, { foreignKey: 'vehicleTypeId', as: 'fares' });
ZoneVehicleFare.hasMany(FareHistory, { foreignKey: 'fareId', as: 'history' });
FareHistory.belongsTo(ZoneVehicleFare, { foreignKey: 'fareId', as: 'fare' });
FareHistory.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Booking.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Booking.belongsTo(Zone, { foreignKey: 'zoneId', as: 'zone' });
Booking.belongsTo(VehicleType, { foreignKey: 'vehicleTypeId', as: 'vehicleType' });
Booking.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
Booking.hasOne(BookingParcel, { foreignKey: 'bookingId', as: 'parcel' });
BookingParcel.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

export {
  User, OtpVerification, UserSession, Device, Admin, Driver, AdminSession, AdminOtpVerification,
  Service, Zone, ZoneService, VehicleType, ServiceVehicleType, ZoneVehicleFare, FareHistory, Booking, BookingParcel
};
