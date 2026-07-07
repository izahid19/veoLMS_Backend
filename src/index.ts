import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import { config } from './config/config';
import { connectDB } from './config/db';
import { corsMiddleware } from './middleware/cors.middleware';
import { reqLogger } from './middleware/req.middleware';
import { errorHandler } from './middleware/error.middleware';
import { csrfMiddleware } from './middleware/csrf.middleware';
import authRoute from './routes/auth.route';
import courseRoute from './routes/course.route';
import enrollmentRoute from './routes/enrollment.route';
import paymentRoute from './routes/payment.route';
import adminRoute from './routes/admin.route';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
const app: Application = express();
const PORT = config.PORT;

// Security & utility middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(reqLogger);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(csrfMiddleware);

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.headers) mongoSanitize.sanitize(req.headers);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api', courseRoute);
app.use('/api', enrollmentRoute);
app.use('/api', paymentRoute);
app.use('/api', adminRoute);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!' });
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const start = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log('✅ Server Started Successfully');
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
