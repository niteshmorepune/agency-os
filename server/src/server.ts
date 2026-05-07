import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logger } from './lib/logger';
import { requestLogger } from './middleware/requestLogger.middleware';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import userRoutes from './routes/users.routes';
import aiRoutes from './routes/ai.routes';
import optimizationRoutes from './routes/optimization.routes';
import postRoutes from './routes/posts.routes';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Static uploads
app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? './uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/posts', postRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React SPA — must come after all /api routes
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err: Error & { statusCode?: number; errors?: unknown[] }, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: { message: err.message, name: err.name }, url: req.url, method: req.method, userId: req.user?.userId });

  if (err.message === 'BUDGET_EXCEEDED') {
    res.status(429).json({ error: 'Monthly AI budget reached. Contact your admin.' });
    return;
  }

  if (err.name === 'ZodError') {
    res.status(400).json({ error: 'Validation failed', details: err.errors });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Something went wrong' : err.message;
  res.status(statusCode).json({ error: message });
});

app.listen(PORT, () => {
  logger.info({ msg: `Agency OS server running on port ${PORT}` });
});

export default app;
