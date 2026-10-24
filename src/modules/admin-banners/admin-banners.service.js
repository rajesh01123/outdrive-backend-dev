import { sequelize } from '../../config/database.js';
import { Banner } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { recordAudit } from '../audit/audit.service.js';

const ordered = [['sortOrder', 'ASC'], ['id', 'ASC']];
const typeLabel = { user: 'user app', driver: 'driver app' };

const adminBannerPayload = (banner) => ({
  id: Number(banner.id),
  image: publicUploadUrl(banner.image),
  type: banner.type,
  sort_order: banner.sortOrder,
  created_at: banner.createdAt,
  updated_at: banner.updatedAt
});

// App contract (GET /common/banners): string id and both image keys.
export const publicBannerPayload = (banner) => {
  const image = publicUploadUrl(banner.image);
  return { id: `b_${banner.id}`, image, image_url: image, type: banner.type, order_by: banner.sortOrder, active: true };
};

export const listLiveBanners = async ({ limit, type }) =>
  (await Banner.findAll({ where: { type }, order: ordered, limit })).map(publicBannerPayload);

const bannerTarget = (banner) => ({ type: 'banner', id: banner.id, label: `Banner #${banner.id} (${typeLabel[banner.type]})` });

const findBanner = async (id) => {
  const banner = await Banner.findByPk(id);
  if (!banner) throw new AppError('banner_not_found', 404);
  return banner;
};

export const listBanners = async () => {
  // User-app banners first, then driver-app banners, each in display order.
  const banners = (await Banner.findAll({ order: [['type', 'ASC'], ...ordered] })).map(adminBannerPayload);
  const count = (type) => banners.filter((banner) => banner.type === type).length;
  return { stats: { total: banners.length, user: count('user'), driver: count('driver') }, banners };
};

// A new banner goes to the end of its own app's list.
export const createBanner = async ({ type, image }) => {
  const lastOrder = (await Banner.max('sortOrder', { where: { type } })) || 0;
  const banner = await Banner.create({ type, image, sortOrder: lastOrder + 1 });
  recordAudit({ action: 'banner.created', target: bannerTarget(banner), description: `Added a ${typeLabel[type]} banner` });
  return adminBannerPayload(banner);
};

export const updateBanner = async ({ id, type, image }) => {
  const banner = await findBanner(id);
  const previous = { type: banner.type, image: banner.image };
  const values = {};
  if (type && type !== banner.type) {
    values.type = type;
    values.sortOrder = ((await Banner.max('sortOrder', { where: { type } })) || 0) + 1;
  }
  if (image) values.image = image;
  if (Object.keys(values).length) await banner.update(values);
  if (image && previous.image !== image) await removeStoredUpload(previous.image);
  const changes = {
    ...(values.type ? { type: { from: previous.type, to: values.type } } : {}),
    ...(image ? { image: { from: 'old image', to: 'new image' } } : {})
  };
  if (Object.keys(changes).length) recordAudit({ action: 'banner.updated', target: bannerTarget(banner), changes, description: `Edited a banner: ${Object.keys(changes).join(', ')}` });
  return adminBannerPayload(banner);
};

// Full list of one app's banners in the new order — every banner of that type exactly once.
export const reorderBanners = ({ type, ids }) =>
  sequelize.transaction(async (transaction) => {
    const banners = await Banner.findAll({ where: { type }, transaction, lock: transaction.LOCK.UPDATE });
    if (banners.length !== ids.length || !banners.every((banner) => ids.includes(Number(banner.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: `ids must contain every ${type} banner exactly once` } });
    }
    const byId = new Map(banners.map((banner) => [Number(banner.id), banner]));
    let moved = 0;
    for (const [index, id] of ids.entries()) {
      const banner = byId.get(id);
      if (banner.sortOrder !== index + 1) { await banner.update({ sortOrder: index + 1 }, { transaction }); moved += 1; }
    }
    if (moved) recordAudit({ action: 'banners.reordered', description: `New order of ${typeLabel[type]} banners: ${ids.map((id) => `#${id}`).join(', ')}` }, { transaction });
    return ids.map((id) => adminBannerPayload(byId.get(id)));
  });

// Banners are not referenced by bookings, so they can be deleted outright (image file included).
export const deleteBanner = async (id) => {
  const banner = await findBanner(id);
  await banner.destroy();
  await removeStoredUpload(banner.image);
  recordAudit({ action: 'banner.deleted', target: bannerTarget(banner), description: `Deleted a ${typeLabel[banner.type]} banner` });
};
