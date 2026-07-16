import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { env } from './env.js';
import { authMiddleware } from './auth.js';
import { authRoutes } from './routes/auth.routes.js';
import { dataRoutes } from './routes/data.routes.js';
import { rbacRoutes } from './routes/rbac.routes.js';
import { metaRoutes } from './routes/meta.routes.js';
import { attachWebSocket } from './ws.js';
import { startWorker } from './sync/worker.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bse-portal-server' }));

// Public: login + demo-user picker.
app.use('/api/auth', authRoutes);

// Everything else requires a valid token; scope is enforced per-feature inside.
const api = express.Router();
api.use(authMiddleware);
api.use(metaRoutes);
api.use(dataRoutes);
api.use('/access-control', rbacRoutes);
app.use('/api', api);

const server = createServer(app);
attachWebSocket(server);

server.listen(env.port, () => {
  console.log(`\n🏛️  BSE Portal server on http://localhost:${env.port}`);
  console.log(`   Serving reads from Postgres only — screens never wait on BSE.`);
  console.log(`   Mock BSE source: ${env.mockBaseUrl}\n`);
  // Kick off the background ingestion loop. Serving is fully independent of it.
  startWorker();
});
