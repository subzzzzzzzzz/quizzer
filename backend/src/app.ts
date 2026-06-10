import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { mongoSanitize } from './middleware/security';
import { config } from './config';

import { errorHandler } from './middleware/error';

// Import Routers
import authRouter from './modules/auth/auth.routes';
import userRouter from './modules/users/user.routes';
import quizRouter from './modules/quizzes/quiz.routes';
import questionRouter from './modules/questions/question.routes';
import participantRouter from './modules/participants/participant.routes';
import attemptRouter from './modules/attempts/attempt.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import { swaggerDocument } from './swagger';

const app = express();

// Set security HTTP headers (bypass for documentation routes to allow unpkg CDN resources)
app.use((req, res, next) => {
  const path = req.path.toLowerCase().replace(/\/$/, '');
  if (path === '/docs' || path === '/api-docs' || path === '/api/v1/swagger.json') {
    return next();
  }
  helmet()(req, res, next);
});

// Enable CORS with credentials support for frontend
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (config.CORS_ORIGIN) {
  config.CORS_ORIGIN.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Rate limiting (apply globally)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize);

// API Routes
const apiPrefix = '/api/v1';
app.use(`${apiPrefix}/auth`, authRouter);
app.use(`${apiPrefix}/users`, userRouter);
app.use(`${apiPrefix}/quizzes`, quizRouter);
app.use(`${apiPrefix}/questions`, questionRouter);
app.use(`${apiPrefix}/participants`, participantRouter);
app.use(`${apiPrefix}/attempts`, attemptRouter);
app.use(`${apiPrefix}/analytics`, analyticsRouter);

// Swagger JSON endpoint
app.get(`${apiPrefix}/swagger.json`, (_req, res) => {
  res.json(swaggerDocument);
});

// Swagger UI Docs HTML page
const docsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QuizArena API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png" />
  <style>
    html { box-sizing: border-box; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "${apiPrefix}/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
`;

app.get('/api-docs', (_req, res) => {
  res.send(docsHtml);
});

app.get('/docs', (_req, res) => {
  res.send(docsHtml);
});

// Base route
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'QuizArena API is running.',
    version: '1.0.0',
  });
});

// 404 Route handler
app.use((_req, res, _next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global Error Handler
app.use(errorHandler);

export { app };
