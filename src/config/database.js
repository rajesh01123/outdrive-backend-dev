import { Sequelize } from 'sequelize';
import { env } from './env.js';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.nodeEnv === 'development' ? false : false,
  timezone: '+00:00',
  define: {
    underscored: true,
    freezeTableName: true
  }
});

export const connectDatabase = async () => {
  await sequelize.authenticate();
};
