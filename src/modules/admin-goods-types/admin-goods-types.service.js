import { sequelize } from '../../config/database.js';
import { BookingParcel, GoodsType } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';
import { removeStoredUpload } from '../../shared/utils/image-upload.js';
import { publicProfilePictureUrl as publicUploadUrl } from '../../shared/utils/serializers.js';
import { recordAudit } from '../audit/audit.service.js';

const ordered = [['sortOrder', 'ASC'], ['id', 'ASC']];
const goodsTarget = (goodsType) => ({ type: 'goods_type', id: goodsType.id, label: goodsType.name });

const adminGoodsTypePayload = (goodsType, usedCount = 0) => ({
  id: Number(goodsType.id),
  name: goodsType.name,
  icon: publicUploadUrl(goodsType.icon),
  sort_order: goodsType.sortOrder,
  status: goodsType.status,
  used_count: usedCount,
  updated_at: goodsType.updatedAt
});

// GET /common/goods-types — the parcel screen's list; goods_type_id in BOOK-01 is one of these ids.
export const listActiveGoodsTypes = async () =>
  (await GoodsType.findAll({ where: { status: 'active' }, order: ordered }))
    .map((goodsType) => ({ id: Number(goodsType.id), name: goodsType.name, icon: publicUploadUrl(goodsType.icon), order_by: goodsType.sortOrder }));

const findGoodsType = async (id) => {
  const goodsType = await GoodsType.findByPk(id);
  if (!goodsType) throw new AppError('goods_type_not_found', 404);
  return goodsType;
};

const usedCount = (goodsTypeId) => BookingParcel.count({ where: { goodsTypeId } });

const assertUniqueName = async (name, goodsTypeId) => {
  const other = await GoodsType.findOne({ where: { name } });
  if (other && Number(other.id) !== Number(goodsTypeId)) throw new AppError('goods_type_name_exists', 409, { errors: { name: 'another goods type already has this name' } });
};

export const listGoodsTypes = async () => {
  const [goodsTypes, uses] = await Promise.all([
    GoodsType.findAll({ order: ordered }),
    BookingParcel.findAll({ attributes: ['goodsTypeId', [sequelize.fn('COUNT', sequelize.col('id')), 'uses']], group: ['goodsTypeId'], raw: true })
  ]);
  const useMap = new Map(uses.map((row) => [Number(row.goodsTypeId), Number(row.uses)]));
  const payloads = goodsTypes.map((goodsType) => adminGoodsTypePayload(goodsType, useMap.get(Number(goodsType.id)) || 0));
  return { stats: { total: payloads.length, active: payloads.filter((item) => item.status === 'active').length }, goods_types: payloads };
};

export const createGoodsType = async ({ body, icon }) => {
  await assertUniqueName(body.name);
  const sortOrder = ((await GoodsType.max('sortOrder')) || 0) + 1;
  const goodsType = await GoodsType.create({ name: body.name, status: body.status, icon, sortOrder });
  recordAudit({ action: 'goods_type.created', target: goodsTarget(goodsType), description: `Added goods type "${goodsType.name}"` });
  return adminGoodsTypePayload(goodsType);
};

export const updateGoodsType = async ({ id, body, icon }) => {
  const goodsType = await findGoodsType(id);
  if (body.name !== undefined) await assertUniqueName(body.name, goodsType.id);
  const before = { name: goodsType.name, status: goodsType.status };
  const previousIcon = goodsType.icon;
  const values = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.status !== undefined) values.status = body.status;
  if (icon) values.icon = icon;
  if (Object.keys(values).length) await goodsType.update(values);
  if (icon && previousIcon !== icon) await removeStoredUpload(previousIcon);
  const changes = {
    ...(before.name !== goodsType.name ? { name: { from: before.name, to: goodsType.name } } : {}),
    ...(before.status !== goodsType.status ? { status: { from: before.status, to: goodsType.status } } : {}),
    ...(icon ? { icon: { from: previousIcon ? 'old icon' : null, to: 'new icon' } } : {})
  };
  if (Object.keys(changes).length) recordAudit({ action: 'goods_type.updated', target: goodsTarget(goodsType), changes, description: `Edited goods type "${goodsType.name}": ${Object.keys(changes).join(', ')}` });
  return adminGoodsTypePayload(goodsType, await usedCount(goodsType.id));
};

export const updateGoodsTypeStatus = async ({ id, status }) => {
  const goodsType = await findGoodsType(id);
  const previous = goodsType.status;
  await goodsType.update({ status });
  if (previous !== status) recordAudit({ action: 'goods_type.status_changed', target: goodsTarget(goodsType), changes: { status: { from: previous, to: status } }, description: `Goods type "${goodsType.name}" set to ${status}` });
  return adminGoodsTypePayload(goodsType, await usedCount(goodsType.id));
};

// Full list in the new order — every goods type exactly once. Returns the same data as the list.
export const reorderGoodsTypes = async (ids) => {
  await sequelize.transaction(async (transaction) => {
    const goodsTypes = await GoodsType.findAll({ transaction, lock: transaction.LOCK.UPDATE });
    if (goodsTypes.length !== ids.length || !goodsTypes.every((goodsType) => ids.includes(Number(goodsType.id)))) {
      throw new AppError('validation_error', 422, { errors: { ids: 'ids must contain every goods type exactly once' } });
    }
    const byId = new Map(goodsTypes.map((goodsType) => [Number(goodsType.id), goodsType]));
    let moved = 0;
    for (const [index, id] of ids.entries()) {
      const goodsType = byId.get(id);
      if (goodsType.sortOrder !== index + 1) { await goodsType.update({ sortOrder: index + 1 }, { transaction }); moved += 1; }
    }
    if (moved) recordAudit({ action: 'goods_types.reordered', description: `New order: ${ids.map((id) => byId.get(id).name).join(', ')}` }, { transaction });
  });
  return listGoodsTypes();
};

// Parcel bookings keep a copy of the name, but a goods type in use is switched off rather than deleted.
export const deleteGoodsType = async (id) => {
  const goodsType = await findGoodsType(id);
  if (await usedCount(goodsType.id)) throw new AppError('goods_type_in_use', 409, { errors: { id: 'this goods type is used in parcel bookings; switch it off instead' } });
  await goodsType.destroy();
  await removeStoredUpload(goodsType.icon);
  recordAudit({ action: 'goods_type.deleted', target: goodsTarget(goodsType), description: `Deleted goods type "${goodsType.name}"` });
};
