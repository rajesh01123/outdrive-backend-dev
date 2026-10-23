import { sequelize } from '../../config/database.js';
import { FavouriteLocation, User } from '../../database/models/index.js';
import { AppError } from '../../shared/utils/app-error.js';

export const MAX_FAVOURITES = 15;

// Flutter contract: ids and coordinates as strings; favourites are single points, so drop_* is always "".
export const favouritePayload = (row) => ({
  id: `f_${row.id}`,
  pick_lat: String(Number(row.pickLat)),
  pick_lng: String(Number(row.pickLng)),
  drop_lat: '',
  drop_lng: '',
  pick_address: row.pickAddress,
  drop_address: '',
  address_name: row.addressName,
  landmark: row.landmark || ''
});

// Home first, then Work, then the rest in the order they were added.
const rank = (row) => ({ home: 0, work: 1 }[row.nameKey] ?? 2);

export const listFavourites = async (userId) => {
  const rows = await FavouriteLocation.findAll({ where: { userId }, order: [['id', 'ASC']] });
  return rows.sort((a, b) => rank(a) - rank(b)).map(favouritePayload);
};

// HOME-06 — same name (case-insensitive) updates that favourite, so there is only ever one Home and one Work.
export const addFavourite = ({ userId, body }) =>
  sequelize.transaction(async (transaction) => {
    // Lock the user row so two quick taps cannot both pass the limit check.
    await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    const nameKey = body.address_name.toLowerCase();
    const values = {
      addressName: body.address_name,
      nameKey,
      pickLat: body.pick_lat,
      pickLng: body.pick_lng,
      pickAddress: body.pick_address,
      landmark: body.landmark || null
    };
    const existing = await FavouriteLocation.findOne({ where: { userId, nameKey }, transaction });
    if (existing) return favouritePayload(await existing.update(values, { transaction }));

    const count = await FavouriteLocation.count({ where: { userId }, transaction });
    if (count >= MAX_FAVOURITES) throw new AppError('favourite_limit_reached', 422, { limit: MAX_FAVOURITES });
    return favouritePayload(await FavouriteLocation.create({ userId, ...values }, { transaction }));
  });

// HOME-07 — accepts "f_91" or "91".
export const deleteFavourite = async ({ userId, rawId }) => {
  const match = rawId.match(/^(?:f_)?(\d+)$/i);
  const row = match ? await FavouriteLocation.findByPk(Number(match[1])) : null;
  if (!row) throw new AppError('favourite_not_found', 404);
  if (Number(row.userId) !== Number(userId)) throw new AppError('forbidden', 403);
  await row.destroy();
  return { id: `f_${row.id}` };
};
