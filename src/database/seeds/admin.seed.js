import bcrypt from 'bcryptjs';
import { connectDatabase, sequelize } from '../../config/database.js';
import { Admin } from '../models/index.js';

const email = process.env.ADMIN_EMAIL || 'admin@outdrive.local';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

const seed = async () => {
  await connectDatabase();
  const existing = await Admin.findOne({ where: { email } });
  if (!existing) {
    await Admin.create({
      name: process.env.ADMIN_NAME || 'OutDrive Admin',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'super_admin'
    });
    console.info(`Seeded ${email}. Change ADMIN_PASSWORD before production.`);
  } else {
    console.info(`Admin ${email} already exists.`);
  }
};

seed()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exitCode = 1;
  });
