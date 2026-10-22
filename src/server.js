import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { openApiSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import routes from './routes.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'OK', data: { status: 'up' } }));
app.get('/api-docs.json', (req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true, swaggerOptions: { persistAuthorization: true } }));
app.use(env.apiPrefix, routes);
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDatabase();
  app.listen(env.port, () => console.info(`OutDrive API listening on port ${env.port}`));
};

if (process.env.NODE_ENV !== 'test') {
  start().catch((error) => {
    console.error('Unable to start API:', error);
    process.exit(1);
  });
}

export default app;
