import { connectDatabase, sequelize } from '../config/database.js';
import { seedAdmin } from './seeds/admin.seed.js';
import { seedBanners } from './seeds/banners.seed.js';
import { seedCms } from './seeds/cms.seed.js';
import { seedCoupons } from './seeds/coupons.seed.js';
import { seedRideSetup } from './seeds/ride-setup.seed.js';
import { seedServices } from './seeds/services.seed.js';

// One command for all seed data. Order matters: ride setup maps vehicles onto the ride modules.
// Every seeder only fills what is missing, so this is safe to run any number of times.
const steps = [
  ['Admin user', seedAdmin],
  ['Ride modules', seedServices],
  ['Ride setup (vehicles, mapping, zone, fares)', seedRideSetup],
  ['Home banners', seedBanners],
  ['Content pages, FAQs, support contacts', seedCms],
  ['Demo coupons', seedCoupons]
];

const seed = async () => {
  await connectDatabase();
  for (const [label, run] of steps) {
    console.info(`▶ ${label}`);
    try {
      await run();
    } catch (error) {
      console.error(`✗ ${label} failed: ${error.message}`);
      throw error;
    }
  }
  console.info('✓ Seeding complete.');
};

seed()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exitCode = 1;
  });
