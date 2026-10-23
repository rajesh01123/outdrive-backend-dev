import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service } from '../models/index.js';
import { uploadDirectory } from '../../shared/utils/image-upload.js';

const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'services');

// The 7 HOME-01 ride modules. module_key and the type fields are the app contract.
const modules = [
  { moduleKey: 'one_way', name: 'One Way', shortDescription: 'City ride', description: 'Point to point city ride', section: 'rides', transportType: 'taxi', serviceType: 'normal', iconTypesFor: 'taxi', status: 'active', sortOrder: 1, asset: 'one-way.webp' },
  { moduleKey: 'shared', name: 'Shared Ride', shortDescription: 'Share seats', description: 'Share seats, lower fare', section: 'rides', transportType: 'taxi', serviceType: 'shared_ride', iconTypesFor: 'taxi', status: 'active', sortOrder: 2, asset: 'shared-ride.webp' },
  { moduleKey: 'outstation', name: 'Outstation', shortDescription: 'Intercity', description: 'City to city one way', section: 'rides', transportType: 'taxi', serviceType: 'outstation', iconTypesFor: 'outstation', status: 'active', sortOrder: 3, asset: 'outstation.webp' },
  { moduleKey: 'round_trip', name: 'Round Trip', shortDescription: 'Go & return', description: 'Outstation go and return', section: 'rides', transportType: 'taxi', serviceType: 'outstation', iconTypesFor: 'outstation', status: 'active', sortOrder: 4, asset: 'round-trip.webp' },
  { moduleKey: 'scheduled', name: 'Scheduled', shortDescription: 'Book for later', description: 'Schedule city ride', section: 'rides', transportType: 'taxi', serviceType: 'normal', iconTypesFor: 'taxi', status: 'active', sortOrder: 5, asset: 'scheduled.webp' },
  { moduleKey: 'parcel_bike', name: 'Parcel on Bike', shortDescription: 'Light parcels', description: 'Send parcel on bike', section: 'parcel', transportType: 'delivery', serviceType: 'normal', iconTypesFor: 'delivery', status: 'active', sortOrder: 10, asset: 'parcel.webp' },
  { moduleKey: 'parcel_3wheeler', name: 'Parcel on 3 Wheeler', shortDescription: 'Bigger parcels', description: 'Send parcel on 3 wheeler / auto', section: 'parcel', transportType: 'delivery', serviceType: 'normal', iconTypesFor: 'delivery', status: 'active', sortOrder: 11, asset: 'parcel.webp' }
];

const copyAsset = async (asset) => {
  const fileName = `${crypto.randomUUID()}${path.extname(asset)}`;
  await fs.mkdir(uploadDirectory('services'), { recursive: true });
  await fs.copyFile(path.join(assetsDir, asset), path.join(uploadDirectory('services'), fileName));
  return `uploads/services/${fileName}`;
};

// Creates missing modules and fills a missing image; never overwrites anything an admin changed.
export const seedServices = async () => {
  for (const { asset, ...module } of modules) {
    const existing = await Service.findOne({ where: { moduleKey: module.moduleKey } });
    if (!existing) {
      await Service.create({ ...module, image: await copyAsset(asset) });
      console.info(`  Seeded module ${module.moduleKey}.`);
    } else if (!existing.image) {
      await existing.update({ image: await copyAsset(asset) });
      console.info(`  Added default image to module ${module.moduleKey}.`);
    } else {
      console.info(`  Module ${module.moduleKey} already exists.`);
    }
  }
};
