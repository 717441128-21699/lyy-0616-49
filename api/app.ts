import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRouter from './routes/auth.js';
import postsRouter from './routes/posts.js';
import usersRouter from './routes/users.js';
import servicesRouter from './routes/services.js';
import transactionsRouter from './routes/transactions.js';
import conversationsRouter from './routes/conversations.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';

import { dbOps, initDatabase, db } from './db/index.js';
import SQLiteStoreFactory from 'connect-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

initDatabase();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SQLiteStore = SQLiteStoreFactory(session);

const sessionMiddleware = session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: 'timebank-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
});

app.use(sessionMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/users', usersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats/public', async (_req, res) => {
  const totalUsers = await dbOps.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  const totalServices = await dbOps.get<{ count: number }>("SELECT COUNT(*) as count FROM services WHERE status = 'completed'");
  const totalHours = await dbOps.get<{ total: number }>("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'service'");
  const activePosts = await dbOps.get<{ count: number }>("SELECT COUNT(*) as count FROM posts WHERE status = 'active'");

  res.json({
    success: true,
    data: {
      totalUsers: totalUsers?.count ?? 0,
      totalServices: totalServices?.count ?? 0,
      totalHours: totalHours?.total ?? 0,
      activePosts: activePosts?.count ?? 0,
    },
  });
});

const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
