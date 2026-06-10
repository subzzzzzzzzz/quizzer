import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/setup.ts',
        'src/test/utils.tsx',
        'src/main.tsx',
        'vite.config.ts',
        'vitest.config.ts',
        'src/vite-env.d.ts',
        'dist/',
        'build/',
        'src/assets/icons/**',
        'src/services/api.ts',
        'src/pages/instructor/QuizEditor.tsx',
        'src/pages/candidate/QuizAttempt.tsx',
        'src/pages/instructor/QuizList.tsx',
        'src/layouts/MainLayout.tsx',
        'src/components/ui/Icon/Icon.tsx',
        'src/pages/auth/LoginPage.tsx',
        'src/pages/auth/SignupPage.tsx',
        'src/pages/instructor/AnalyticsDashboard.tsx',
        'src/pages/instructor/QuizAnalyticsDetail.tsx',
        'src/pages/admin/AdminQuizResults.tsx',
        'src/pages/admin/AccessManagement.tsx',
        'src/pages/candidate/AttemptReport.tsx',
        'src/pages/admin/AdminDashboard.tsx',
        'src/pages/instructor/InstructorDashboard.tsx',
        'src/pages/candidate/CandidateDashboard.tsx',
        'src/App.tsx',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      }
    },
  },
});
