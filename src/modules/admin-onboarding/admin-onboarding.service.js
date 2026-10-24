import { sequelize } from '../../config/database.js';
import { OnboardingSlide } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { changedFields, diffChanges, recordAudit } from '../audit/audit.service.js';

const ordered = [['sortOrder', 'ASC'], ['id', 'ASC']];
const SLIDE_AUDIT_FIELDS = ['title', 'description', 'title_hi', 'description_hi', 'status'];
const slideTarget = (slide) => ({ type: 'onboarding_slide', id: slide.id, label: slide.title });

const adminSlidePayload = (slide) => ({
  id: Number(slide.id),
  title: slide.title,
  description: slide.description || '',
  title_hi: slide.titleHi || '',
  description_hi: slide.descriptionHi || '',
  image: publicUploadUrl(slide.image),
  sort_order: slide.sortOrder,
  status: slide.status,
  updated_at: slide.updatedAt
});

// HOME-09 app contract: string id, English unless Hindi text exists for locale=hi.
const publicSlidePayload = (slide, locale) => ({
  id: `ob_${slide.id}`,
  order_by: slide.sortOrder,
  title: (locale === 'hi' && slide.titleHi) || slide.title,
  description: (locale === 'hi' && slide.descriptionHi) || slide.description || '',
  image: publicUploadUrl(slide.image),
  active: true
});

export const listLiveSlides = async ({ locale }) =>
  (await OnboardingSlide.findAll({ where: { status: 'active' }, order: ordered })).map((slide) => publicSlidePayload(slide, locale));

const findSlide = async (id) => {
  const slide = await OnboardingSlide.findByPk(id);
  if (!slide) throw new AppError('onboarding_slide_not_found', 404);
  return slide;
};

const slideValues = (body) => {
  const values = {};
  if (body.title !== undefined) values.title = body.title;
  if (body.description !== undefined) values.description = body.description || null;
  if (body.title_hi !== undefined) values.titleHi = body.title_hi || null;
  if (body.description_hi !== undefined) values.descriptionHi = body.description_hi || null;
  if (body.status !== undefined) values.status = body.status;
  return values;
};

export const listSlides = async () => {
  const slides = (await OnboardingSlide.findAll({ order: ordered })).map(adminSlidePayload);
  return {
    stats: { total: slides.length, active: slides.filter((slide) => slide.status === 'active').length, inactive: slides.filter((slide) => slide.status === 'inactive').length },
    slides
  };
};

export const createSlide = async ({ body, image }) => {
  const sortOrder = ((await OnboardingSlide.max('sortOrder')) || 0) + 1;
  const slide = await OnboardingSlide.create({ ...slideValues(body), image, sortOrder });
  recordAudit({ action: 'onboarding.created', target: slideTarget(slide), description: `Added onboarding slide "${slide.title}"` });
  return adminSlidePayload(slide);
};

export const updateSlide = async ({ id, body, image }) => {
  const slide = await findSlide(id);
  const before = adminSlidePayload(slide);
  const previousImage = slide.image;
  const values = slideValues(body);
  if (image) values.image = image;
  if (Object.keys(values).length) await slide.update(values);
  if (image && previousImage !== image) await removeStoredUpload(previousImage);
  const payload = adminSlidePayload(slide);
  const changes = { ...diffChanges(before, payload, SLIDE_AUDIT_FIELDS), ...(image ? { image: { from: 'old image', to: 'new image' } } : {}) };
  if (Object.keys(changes).length) recordAudit({ action: 'onboarding.updated', target: slideTarget(slide), changes, description: `Edited onboarding slide "${slide.title}": ${changedFields(changes)}` });
  return payload;
};

export const updateSlideStatus = async ({ id, status }) => {
  const slide = await findSlide(id);
  const previous = slide.status;
  await slide.update({ status });
  if (previous !== status) {
    recordAudit({ action: 'onboarding.status_changed', target: slideTarget(slide), changes: { status: { from: previous, to: status } }, description: `Onboarding slide "${slide.title}" set to ${status}` });
  }
  return adminSlidePayload(slide);
};

// Full list in the new order — every slide exactly once, so two admins cannot leave gaps or duplicates.
export const reorderSlides = (ids) =>
  sequelize.transaction(async (transaction) => {
    const slides = await OnboardingSlide.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    if (slides.length !== ids.length || !slides.every((slide) => ids.includes(Number(slide.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every slide exactly once' } });
    }
    const byId = new Map(slides.map((slide) => [Number(slide.id), slide]));
    let moved = 0;
    for (const [index, id] of ids.entries()) {
      const slide = byId.get(id);
      if (slide.sortOrder !== index + 1) { await slide.update({ sortOrder: index + 1 }, { transaction }); moved += 1; }
    }
    if (moved) recordAudit({ action: 'onboarding.reordered', description: `New order: ${ids.map((id) => byId.get(id).title).join(', ')}` }, { transaction });
    return ids.map((id) => adminSlidePayload(byId.get(id)));
  });

export const deleteSlide = async (id) => {
  const slide = await findSlide(id);
  await slide.destroy();
  await removeStoredUpload(slide.image);
  recordAudit({ action: 'onboarding.deleted', target: slideTarget(slide), description: `Deleted onboarding slide "${slide.title}"` });
};
