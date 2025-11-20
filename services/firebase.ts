import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Detect if running in Vite (browser) or Node.js (script) environment
const isViteEnv = typeof import.meta !== 'undefined' && import.meta.env;

// Get environment variable from either Vite or Node.js
const getEnv = (key: string): string | undefined => {
  if (isViteEnv) {
    return import.meta.env[key];
  }
  // Node.js environment (for scripts with dotenv)
  return process.env[key];
};

// Firebase configuration from environment variables
// For Vite, environment variables must be prefixed with VITE_ to be exposed to client code
// For Node.js scripts, load from .env using dotenv
// See .env.example for required variables
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
};

// Validate that all required environment variables are present
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !getEnv(varName)
);

if (missingVars.length > 0) {
  console.error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}\n` +
    'Please create a .env file based on .env.example'
  );
}

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'us-central1'); // Same region as Cloud Functions
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase initialized successfully (Auth, Firestore, Storage, Functions)");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { auth, db, storage, functions, googleProvider, firebaseConfig };