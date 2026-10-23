import bcrypt from 'bcryptjs';
import { Admin } from '../models/index.js';

const email = process.env.ADMIN_EMAIL || 'admin@outdrive.local';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

export const seedAdmin = async () => {
  const existing = await Admin.findOne({ where: { email } });
  if (existing) {
    console.info(`  Admin ${email} already exists.`);
    return;
  }
  await Admin.create({
    name: process.env.ADMIN_NAME || 'OutDrive Admin',
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'super_admin'
  });
  console.info(`  Seeded ${email}. Change ADMIN_PASSWORD before production.`);
};
