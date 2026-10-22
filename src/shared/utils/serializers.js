import { env } from '../../config/env.js';

export const publicProfilePictureUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${env.appUrl}/${value.replace(/^\//, '')}`;
};

export const userPayload = (user, { detailed = false } = {}) => {
  const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;
  const result = {
    id: `u_${userJson.id}`,
    name: userJson.name,
    mobile: userJson.mobile,
    country_code: userJson.countryCode,
    profile_picture: publicProfilePictureUrl(userJson.profilePicture)
  };

  if (detailed) {
    Object.assign(result, {
      gender: userJson.gender || '',
      map_type: userJson.mapType || '',
      wallet_balance: Number(userJson.walletBalance || 0),
      emergency_contact_name: userJson.emergencyContactName || '',
      emergency_contact_number: userJson.emergencyContactNumber || '',
      locale: userJson.locale || 'en'
    });
  }

  return result;
};
