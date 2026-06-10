# QuizArena - Secure Assessment Platform

QuizArena is a comprehensive, role-based, and proctored assessment application designed for hosting and taking secure online tests. It supports role-based dashboards (Admin, Instructor, and Candidate) and includes real-time proctoring features (tab visibility detection, time limits, and session logging).

---

## 🛠️ Tech Stacks

### Frontend Architecture
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/) (Client Environment)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) + **RTK Query** (for automated API caching and synchronization)
- **UI Design System**: [Ant Design (antd)](https://ant.design/)
- **Styling**: Premium Vanilla CSS utilizing modern CSS custom variables (Light/Dark themes, glassmorphism, and responsive layouts)
- **Icons**: Custom dynamic SVG-based [Icon](frontend/src/components/ui/Icon/Icon.tsx) component
- **Unit Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) + **jsdom** + **v8 coverage**

### Backend Architecture
- **Platform**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (RESTful Web Service)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (compiled via `tsc` and executed via `tsx` watcher)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose ODM](https://mongoosejs.com/)
- **Validation**: [Zod Schema Validation](https://zod.dev/)
- **Security**: 
  - [JSON Web Tokens (JWT)](https://jwt.io/) & signed secure cookies
  - [Helmet](https://helmetjs.github.io/) (secure HTTP headers)
  - [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) (prevent brute force)
  - [Mongo Sanitize](https://www.npmjs.com/package/express-mongo-sanitize) (prevent NoSQL injections)
  - CORS policies
- **Unit Testing**: [Jest](https://jestjs.io/) + `ts-jest` + `supertest` + [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server) (for isolated, zero-dependency testing database)

---

## 📂 Project Structure

```bash
quiz-arena/
├── backend/          # Node/Express API Server (TypeScript, MongoDB, Jest)
├── frontend/         # React SPA (Vite, TypeScript, Redux, Ant Design, Vitest)
└── README.md         # Documentation & Development Guide
```

---

## ⚙️ Environment Setup

### 1. Backend Environment Configuration
Create a `.env` file in the [backend/](backend/) directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/quizarena
JWT_SECRET=your_jwt_secret_key_change_me_in_production
COOKIE_SECRET=your_cookie_secure_salt_change_me
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## 🚀 Getting Started (End-to-End Execution)

### Step 1: Install Dependencies
Install packages in both directories:
```bash
# In backend directory
cd backend
npm install

# In frontend directory
cd ../frontend
npm install
```

### Step 2: Seed the Database
Initialize test users (Admin, Instructors, Candidates) and mock quizzes:
```bash
# In backend directory
cd backend
npm run seed
```

Default credentials created by the seed script:
* **Admin**: `admin@quizarena.com` / `Password123`
* **Instructor**: `instructor@quizarena.com` / `Password123`
* **Candidate**: `candidate@quizarena.com` / `Password123`

### Step 3: Run Development Servers
Run the backend and frontend dev servers concurrently:

```bash
# Start backend API (runs on http://localhost:3000)
cd backend
npm run dev

# Start frontend application (runs on http://localhost:5173)
cd ../frontend
npm run dev
```

Open `http://localhost:5173` in your browser to access the app.

---

## 📖 API Documentation (Swagger / OpenAPI)

The backend provides interactive and machine-readable API documentation following the OpenAPI 3.0 specification. It covers all endpoints, query parameters, payload schemas, and authentication details.

### Accessing the Documentation
When the backend server is running locally on port `3000`, you can access the docs via:
* **Interactive Swagger UI**: Visit **[http://localhost:3000/docs](http://localhost:3000/docs)** (or **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**).
* **Raw OpenAPI Spec (JSON)**: Access the specification schema at **[http://localhost:3000/api/v1/swagger.json](http://localhost:3000/api/v1/swagger.json)**.

### Testing Authenticated Endpoints in Swagger UI
1. Go to the `POST /auth/login` endpoint in the docs.
2. Click **Try it out**, enter the seed credentials (e.g. `instructor@quizarena.com` / `Password123`), and click **Execute**.
3. Upon successful validation, your browser automatically saves the secure `token` cookie.
4. All subsequent API queries executed directly through the Swagger UI (e.g. creating quizzes or fetching candidates) will automatically be authenticated!

---

## 🧪 Executing Tests & Generating Coverage Reports

Both directories support comprehensive test suites with target code coverage metrics of **>90%**.

### 1. Frontend Testing (Vitest)
Tests cover slices, custom layouts, role-based workflows, dynamic SVG icons, and page validations.

```bash
cd frontend

# Run test cases once
npm run test

# Run tests in watch/interactive mode
npm run test:watch

# Execute tests and print statement/branch/line/function coverage reports
npm run test:cov
```
*Vitest coverage outputs are available in the console and as interactive HTML reports in `frontend/coverage/index.html`.*

### 2. Backend Testing (Jest)
Integrative tests cover Express controllers, Mongoose hooks, middleware, authentication flows, and security filters using `mongodb-memory-server` to run mock databases in-memory.

```bash
cd backend

# Run Jest tests
npm run test

# Run tests and output JSON/Console coverage reports
npm run test:cov
```
*Jest coverage metrics output in the console and are saved in `backend/coverage/lcov-report/index.html`.*

---

## 📦 Building for Production

### Frontend Assets Bundle
Compile TypeScript files and bundle static assets (HTML, CSS, JS) optimized for CDN deployment:
```bash
cd frontend
npm run build
```
The compiled SPA is output to the `frontend/dist/` directory.

### Backend Compilation
Transpile TypeScript source files into native JavaScript code:
```bash
cd backend
npm run build
```
The production server outputs to `backend/dist/` and can be started using:
```bash
npm run start
```
