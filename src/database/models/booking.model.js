import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { jsonColumn } from './json-column.js';

export class Booking extends Model {}

const coordinate = (field) => ({ type: DataTypes.DECIMAL(10, 7), allowNull: false, field });

Booking.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    serviceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'service_id' },
    zoneId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'zone_id' },
    zoneFareId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'zone_fare_id' },
    vehicleTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'vehicle_type_id' },
    driverId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'driver_id' },
    moduleKey: { type: DataTypes.STRING(40), allowNull: false, field: 'module_key' },
    vehicleName: { type: DataTypes.STRING(60), allowNull: false, field: 'vehicle_name' },
    status: {
      type: DataTypes.ENUM('searching', 'scheduled', 'accepted', 'arrived', 'on_trip', 'completed', 'cancelled', 'no_driver_found'),
      allowNull: false,
      defaultValue: 'searching'
    },
    paymentOpt: { type: DataTypes.ENUM('cash', 'wallet', 'online'), allowNull: false, field: 'payment_opt' },
    pickLat: coordinate('pick_lat'),
    pickLng: coordinate('pick_lng'),
    pickAddress: { type: DataTypes.STRING(255), allowNull: false, field: 'pick_address' },
    dropLat: coordinate('drop_lat'),
    dropLng: coordinate('drop_lng'),
    dropAddress: { type: DataTypes.STRING(255), allowNull: false, field: 'drop_address' },
    distanceMeters: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'distance_meters' },
    durationMinutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'duration_minutes' },
    polyline: { type: DataTypes.TEXT, allowNull: true },
    isOutStation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_out_station' },
    isRoundTrip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_round_trip' },
    isLater: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_later' },
    scheduledAt: { type: DataTypes.DATE, allowNull: true, field: 'scheduled_at' },
    sharedRide: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'shared_ride' },
    seatsTaken: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'seats_taken' },
    promoCode: { type: DataTypes.STRING(40), allowNull: true, field: 'promo_code' },
    estimatedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'estimated_amount' },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    fareBreakdown: jsonColumn('fareBreakdown', { field: 'fare_breakdown' }),
    cancelledBy: { type: DataTypes.ENUM('user', 'admin', 'driver', 'system'), allowNull: true, field: 'cancelled_by' },
    cancelReason: { type: DataTypes.STRING(500), allowNull: true, field: 'cancel_reason' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
    couponId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'coupon_id' },
    subtotalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'subtotal_amount' },
    promoDiscount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'promo_discount' },
    requestEtaAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'request_eta_amount' },
    returnAt: { type: DataTypes.DATE, allowNull: true, field: 'return_at' },
    pickupInstruction: { type: DataTypes.STRING(255), allowNull: true, field: 'pickup_instruction' },
    bookForOther: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'book_for_other' },
    otherContactName: { type: DataTypes.STRING(80), allowNull: true, field: 'other_contact_name' },
    otherContactMobile: { type: DataTypes.STRING(15), allowNull: true, field: 'other_contact_mobile' }
  },
  { sequelize, modelName: 'Booking', tableName: 'tbl_bookings' }
);
