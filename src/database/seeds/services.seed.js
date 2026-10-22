import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, sequelize } from '../../config/database.js';
import { Service } from '../models/index.js';
import { uploadDirectory } from '../../shared/utils/image-upload.js';

const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'services');

const services = [
  { slug: 'one_way', name: 'One Way', subtitle: 'City rides', serviceType: 'ride', status: 'active', asset: 'one-way.webp' },
  { slug: 'shared_ride', name: 'Shared Ride', subtitle: 'Share & save on daily commute', serviceType: 'ride', status: 'active', asset: 'shared-ride.webp' },
  { slug: 'outstation', name: 'Outstation', subtitle: 'Intercity trips', serviceType: 'ride', status: 'active', asset: 'outstation.webp' },
  { slug: 'round_trip', name: 'Round Trip', subtitle: 'Go and come back', serviceType: 'ride', status: 'active', asset: 'round-trip.webp' },
  { slug: 'scheduled', name: 'Scheduled', subtitle: 'Book a ride for later', serviceType: 'ride', status: 'coming_soon', asset: 'scheduled.webp' },
  { slug: 'parcel', name: 'Parcel', subtitle: 'Send packages across the city', serviceType: 'parcel', status: 'coming_soon', asset: 'parcel.webp' }
];

const copyAsset = async (asset) => {
  const fileName = `${crypto.randomUUID()}${path.extname(asset)}`;
  await fs.mkdir(uploadDirectory('services'), { recursive: true });
  await fs.copyFile(path.join(assetsDir, asset), path.join(uploadDirectory('services'), fileName));
  return `uploads/services/${fileName}`;
};

// Only missing slugs are created, so re-running never overwrites changes made in the admin panel.
const seed = async () => {
  await connectDatabase();
  for (const [index, { asset, ...service }] of services.entries()) {
    if (await Service.findOne({ where: { slug: service.slug } })) {
      console.info(`Service ${service.slug} already exists.`);
      continue;
    }
    await Service.create({ ...service, sortOrder: index + 1, image: await copyAsset(asset) });
    console.info(`Seeded service ${service.slug}.`);
  }
};

seed()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exitCode = 1;
  });
