import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { openApiSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import routes from './routes.js';
import { startAuditRetention } from './modules/audit/audit.service.js';
import { startBookingTimeouts } from './modules/booking/booking.service.js';
import cmsWebRoutes from './modules/cms/cms-web.routes.js';

const app = express();

app.disable('x-powered-by');
// Behind nginx on the same server, req.ip is the visitor's address (audit logs, admin sessions).
// Only a proxy on this machine is trusted, so outside callers cannot fake X-Forwarded-For.
app.set('trust proxy', 'loopback');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'OK', data: { status: 'up' } }));
app.get('/api-docs.json', (req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true, swaggerOptions: { persistAuthorization: true } }));
// Mobile WebView pages (privacy policy, terms, FAQ, help…), outside the JSON API.
app.use('/pages', cmsWebRoutes);
app.use(env.apiPrefix, routes);
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDatabase();
  startAuditRetention();
  startBookingTimeouts();
  app.listen(env.port, () => console.info(`OutDrive API listening on port ${env.port}`));
};

if (process.env.NODE_ENV !== 'test') {
  start().catch((error) => {
    console.error('Unable to start API:', error);
    process.exit(1);
  });
}

export default app;
