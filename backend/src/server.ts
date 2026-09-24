import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestId } from './middleware/request-id';
import routes from './routes';
import { parseCorsOrigin } from './utils/cors-origin';
import { pool } from './config/database';
import { validateStellarConfig } from './config/stellar';
import paymentMonitorService from './services/payment-monitor.service';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: parseCorsOrigin(process.env.FRONTEND_URL, 'http://localhost:3000'),
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestId);

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Quittance API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health',
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

async function initialize() {
  try {
    console.log('Starting server...');
    await pool.query('SELECT NOW()');
    console.log('Database connected');
    validateStellarConfig();
    paymentMonitorService.start();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  paymentMonitorService.stop();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  paymentMonitorService.stop();
  await pool.end();
  process.exit(0);
});

// Start application
initialize();

export default app;

