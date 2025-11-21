import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Helper to trim whitespace from environment variables
// Prevents issues with trailing newlines or spaces in secrets
const trimEnv = (value: string | undefined): string | undefined => {
  return value?.trim() || undefined;
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(trimEnv(env.GEMINI_API_KEY)),
        'process.env.GEMINI_API_KEY': JSON.stringify(trimEnv(env.GEMINI_API_KEY)),
        // Firebase config (from env vars during Docker build or .env during dev)
        // Trimming ensures no whitespace issues from secrets
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(trimEnv(process.env.VITE_FIREBASE_API_KEY) || trimEnv(env.VITE_FIREBASE_API_KEY)),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(trimEnv(process.env.VITE_FIREBASE_AUTH_DOMAIN) || trimEnv(env.VITE_FIREBASE_AUTH_DOMAIN)),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(trimEnv(process.env.VITE_FIREBASE_PROJECT_ID) || trimEnv(env.VITE_FIREBASE_PROJECT_ID)),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(trimEnv(process.env.VITE_FIREBASE_STORAGE_BUCKET) || trimEnv(env.VITE_FIREBASE_STORAGE_BUCKET)),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(trimEnv(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || trimEnv(env.VITE_FIREBASE_MESSAGING_SENDER_ID)),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(trimEnv(process.env.VITE_FIREBASE_APP_ID) || trimEnv(env.VITE_FIREBASE_APP_ID)),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
