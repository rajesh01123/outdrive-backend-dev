import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Banner } from '../models/index.js';
import { uploadDirectory } from '../../shared/utils/image-upload.js';

const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'banners');

// Demo home banners (1200×600). Replace them from admin → Banners.
const banners = [
  { title: 'Ride across the city', subtitle: 'Book a One Way ride in seconds', linkType: 'module', linkValue: 'one_way', asset: 'city-rides.webp' },
  { title: 'Outstation trips', subtitle: 'Indore to Bhopal, Ujjain and more', linkType: 'module', linkValue: 'outstation', asset: 'outstation.webp' },
  { title: 'Send a parcel', subtitle: 'Fast delivery on bike or 3 wheeler', linkType: 'module', linkValue: 'parcel_bike', asset: 'parcel.webp' }
];

const copyAsset = async (asset) => {
  const fileName = `${crypto.randomUUID()}${path.extname(asset)}`;
  await fs.mkdir(uploadDirectory('banners'), { recursive: true });
  await fs.copyFile(path.join(assetsDir, asset), path.join(uploadDirectory('banners'), fileName));
  return `uploads/banners/${fileName}`;
};

// Only seeds an empty banners table, so banners an admin removed are not brought back.
export const seedBanners = async () => {
  if (await Banner.count()) {
    console.info('  Banners already set up.');
    return;
  }
  for (const [index, { asset, ...banner }] of banners.entries()) {
    await Banner.create({ ...banner, image: await copyAsset(asset), sortOrder: index + 1, status: 'active' });
    console.info(`  Seeded banner "${banner.title}".`);
  }
};
