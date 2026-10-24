import { GoodsType } from '../models/index.js';

// What riders can choose on the parcel screen. Edit, switch off or reorder them from admin.
const goodsTypes = ['Documents', 'Electronics', 'Food', 'Clothes', 'Household', 'Other'];

// Only seeds an empty table, so types an admin removed are not brought back.
export const seedGoodsTypes = async () => {
  if (await GoodsType.count()) {
    console.info('  Goods types already set up.');
    return;
  }
  await GoodsType.bulkCreate(goodsTypes.map((name, index) => ({ name, sortOrder: index + 1, status: 'active' })));
  console.info(`  Seeded ${goodsTypes.length} goods types (${goodsTypes.join(', ')}).`);
};
