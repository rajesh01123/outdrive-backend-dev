import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Banner, Service } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';

// live = shown in the app right now; scheduled / expired = active but outside its dates.
const bannerState = (banner, now = new Date()) => {
  if (banner.status !== 'active') return 'inactive';
  if (banner.startsAt && banner.startsAt > now) return 'scheduled';
  if (banner.endsAt && banner.endsAt < now) return 'expired';
  return 'live';
};

const adminBannerPayload = (banner) => ({
  id: Number(banner.id),
  title: banner.title,
  subtitle: banner.subtitle || '',
  image: publicUploadUrl(banner.image),
  module_key: banner.moduleKey || '',
  link_type: banner.linkType,
  link_value: banner.linkValue || '',
  sort_order: banner.sortOrder,
  status: banner.status,
  state: bannerState(banner),
  starts_at: banner.startsAt,
  ends_at: banner.endsAt
});

// App contract (GET /common/banners): string id, both image keys, "" for missing values.
export const publicBannerPayload = (banner) => {
  const image = publicUploadUrl(banner.image);
  return {
    id: `b_${banner.id}`,
    image,
    image_url: image,
    title: banner.title,
    subtitle: banner.subtitle || '',
    active: true,
    order_by: banner.sortOrder,
    module_key: banner.moduleKey || '',
    link_type: banner.linkType,
    link_value: banner.linkValue || '',
    starts_at: banner.startsAt ? banner.startsAt.toISOString() : '',
    ends_at: banner.endsAt ? banner.endsAt.toISOString() : ''
  };
};

// Live banners only: active and inside their date window. module_key narrows to one module's banners.
export const listLiveBanners = async ({ limit, moduleKey }) => {
  const now = new Date();
  const where = {
    status: 'active',
    [Op.and]: [
      { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
      { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
    ]
  };
  if (moduleKey) where.moduleKey = moduleKey;
  const banners = await Banner.findAll({ where, order: [['sortOrder', 'ASC'], ['id', 'ASC']], limit });
  return banners.map(publicBannerPayload);
};

const findBanner = async (id, options = {}) => {
  const banner = await Banner.findByPk(id, options);
  if (!banner) throw new AppError('banner_not_found', 404);
  return banner;
};

const assertModuleKeys = async (body) => {
  for (const key of ['module_key', 'link_value']) {
    const moduleKey = key === 'module_key' ? body.module_key : body.link_type === 'module' ? body.link_value : '';
    if (moduleKey && !(await Service.findOne({ where: { moduleKey } }))) {
      throw new AppError('validation_error', 422, { errors: { [key]: `${moduleKey} is not a ride module` } });
    }
  }
};

export const listBanners = async () => {
  const banners = await Banner.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  const payloads = banners.map(adminBannerPayload);
  const count = (state) => payloads.filter((banner) => banner.state === state).length;
  return {
    stats: { total: payloads.length, live: count('live'), scheduled: count('scheduled'), expired: count('expired'), inactive: count('inactive') },
    banners: payloads
  };
};

const bannerValues = (body) => {
  const values = {};
  if (body.title !== undefined) values.title = body.title;
  if (body.subtitle !== undefined) values.subtitle = body.subtitle || null;
  if (body.module_key !== undefined) values.moduleKey = body.module_key || null;
  if (body.link_type !== undefined) { values.linkType = body.link_type; values.linkValue = body.link_value || null; }
  if (body.status !== undefined) values.status = body.status;
  if (body.starts_at !== undefined) values.startsAt = body.starts_at;
  if (body.ends_at !== undefined) values.endsAt = body.ends_at;
  return values;
};

export const createBanner = async ({ body, image }) => {
  await assertModuleKeys(body);
  const lastOrder = (await Banner.max('sortOrder')) || 0;
  const banner = await Banner.create({ ...bannerValues(body), image, sortOrder: lastOrder + 1 });
  return adminBannerPayload(banner);
};

export const updateBanner = async ({ id, body, image }) => {
  const banner = await findBanner(id);
  await assertModuleKeys(body);
  const values = bannerValues(body);
  // Dates are checked together with the stored value when only one of them changes.
  const startsAt = values.startsAt !== undefined ? values.startsAt : banner.startsAt;
  const endsAt = values.endsAt !== undefined ? values.endsAt : banner.endsAt;
  if (startsAt && endsAt && endsAt <= startsAt) throw new AppError('validation_error', 422, { errors: { ends_at: 'ends_at must be after starts_at' } });
  const previousImage = banner.image;
  if (image) values.image = image;
  if (Object.keys(values).length) await banner.update(values);
  if (image && previousImage !== image) await removeStoredUpload(previousImage);
  return adminBannerPayload(banner);
};

export const updateBannerStatus = async ({ id, status }) => {
  const banner = await findBanner(id);
  await banner.update({ status });
  return adminBannerPayload(banner);
};

export const reorderBanners = (ids) =>
  sequelize.transaction(async (transaction) => {
    const banners = await Banner.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    if (banners.length !== ids.length || !banners.every((banner) => ids.includes(Number(banner.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every banner exactly once' } });
    }
    const byId = new Map(banners.map((banner) => [Number(banner.id), banner]));
    for (const [index, id] of ids.entries()) {
      const banner = byId.get(id);
      if (banner.sortOrder !== index + 1) await banner.update({ sortOrder: index + 1 }, { transaction });
    }
    return ids.map((id) => adminBannerPayload(byId.get(id)));
  });

// Banners are not referenced by bookings, so they can be deleted outright (image file included).
export const deleteBanner = async (id) => {
  const banner = await findBanner(id);
  await banner.destroy();
  await removeStoredUpload(banner.image);
};
