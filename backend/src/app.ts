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
import UserModel from './modules/users/user.model';
import QuizModel from './modules/quizzes/quiz.model';
import QuestionModel from './modules/questions/question.model';
import ParticipantModel from './modules/participants/participant.model';
import AttemptModel from './modules/attempts/attempt.model';

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
app.get(`${apiPrefix}/swagger.json`, async (_req, res) => {
  try {
    const instructorUser = await UserModel.findOne({ email: 'priya@quizarena.com' });
    const candidate1 = await UserModel.findOne({ email: 'sara@quizarena.com' });
    const candidate2 = await UserModel.findOne({ email: 'rohan@quizarena.com' });

    const completedQuiz = await QuizModel.findOne({ title: 'CSS Advanced Selectors' });
    const liveQuiz = await QuizModel.findOne({ title: 'React Hook Mechanics' });
    const scheduledQuiz = await QuizModel.findOne({ title: 'NodeJS Event Loop' });
    const draftQuiz = await QuizModel.findOne({ title: 'TypeScript Generic Constraints' });

    const cssQuestion = completedQuiz ? await QuestionModel.findOne({ quizId: completedQuiz._id }) : null;
    const reactQuestion = liveQuiz ? await QuestionModel.findOne({ quizId: liveQuiz._id }) : null;

    const cssParticipant = completedQuiz && candidate1 ? await ParticipantModel.findOne({ quizId: completedQuiz._id, userId: candidate1._id }) : null;
    const cssAttempt = completedQuiz && candidate1 ? await AttemptModel.findOne({ quizId: completedQuiz._id, candidateId: candidate1._id }) : null;

    const idsMap: Record<string, string> = {
      CSS_QUIZ_ID: completedQuiz?._id?.toString() || '60d0fe4f5311236168a109cb',
      REACT_QUIZ_ID: liveQuiz?._id?.toString() || '60d0fe4f5311236168a109cc',
      NODE_QUIZ_ID: scheduledQuiz?._id?.toString() || '60d0fe4f5311236168a109cd',
      TS_QUIZ_ID: draftQuiz?._id?.toString() || '60d0fe4f5311236168a109ce',

      CANDIDATE_1_ID: candidate1?._id?.toString() || '60d0fe4f5311236168a109cf',
      CANDIDATE_2_ID: candidate2?._id?.toString() || '60d0fe4f5311236168a109d0',
      INSTRUCTOR_ID: instructorUser?._id?.toString() || '60d0fe4f5311236168a109ca',

      CSS_QUESTION_ID: cssQuestion?._id?.toString() || '60d0fe4f5311236168a109d1',
      REACT_QUESTION_ID: reactQuestion?._id?.toString() || '60d0fe4f5311236168a109d2',

      CSS_PARTICIPANT_ID: cssParticipant?._id?.toString() || '60d0fe4f5311236168a109d3',
      CSS_ATTEMPT_ID: cssAttempt?._id?.toString() || '60d0fe4f5311236168a109d4',
    };

    let docStr = JSON.stringify(swaggerDocument);
    for (const [key, value] of Object.entries(idsMap)) {
      docStr = docStr.split(key).join(value);
    }

    res.json(JSON.parse(docStr));
  } catch (error) {
    res.json(swaggerDocument);
  }
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
        requestInterceptor: function(request) {
          request.credentials = 'include';
          return request;
        },
        responseInterceptor: function(response) {
          if ((response.url.includes('/auth/login') || response.url.includes('/auth/signup')) && (response.status === 200 || response.status === 201)) {
            setTimeout(function() {
              if (window.ui && window.ui.authActions) {
                window.ui.authActions.authorize({
                  cookieAuth: {
                    name: "cookieAuth",
                    schema: {
                      type: "apiKey",
                      in: "cookie",
                      name: "token"
                    },
                    value: "authenticated"
                  }
                });
              }
            }, 50);
          } else if (response.url.includes('/auth/logout') && response.status === 200) {
            setTimeout(function() {
              if (window.ui && window.ui.authActions) {
                window.ui.authActions.logout(["cookieAuth"]);
              }
            }, 50);
          }
          return response;
        }
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
