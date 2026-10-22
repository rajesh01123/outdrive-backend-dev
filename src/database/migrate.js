import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Sequelize } from 'sequelize';
import { sequelize } from '../config/database.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsTable = 'tbl_migrations';

const migrate = async () => {
  await sequelize.authenticate();
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ${migrationsTable} (name VARCHAR(255) NOT NULL PRIMARY KEY, executed_at DATETIME NOT NULL)`);

  const [appliedRows] = await sequelize.query(`SELECT name FROM ${migrationsTable}`);
  const applied = new Set(appliedRows.map((row) => row.name));
  const files = (await readdir(path.join(currentDir, 'migrations'))).filter((file) => file.endsWith('.js')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const migration = await import(pathToFileURL(path.join(currentDir, 'migrations', file)).href);
    // MySQL DDL implicitly commits, so each migration is deliberately applied as one idempotent unit.
    await migration.up({ queryInterface: sequelize.getQueryInterface(), Sequelize });
    await sequelize.getQueryInterface().bulkInsert(migrationsTable, [{ name: file, executed_at: new Date() }]);
    console.log(`Applied ${file}`);
  }
};

migrate()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exitCode = 1;
  });
