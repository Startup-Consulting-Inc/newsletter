import React, { useState, useEffect } from 'react';
import { auth, googleProvider, firebaseConfig } from '../services/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Lock, Mail, ArrowRight, AlertCircle, Settings, ExternalLink, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState(false);
  
  // State for specific setup guidance
  const [setupGuide, setSetupGuide] = useState<{title: string, steps: string[]} | null>(null);

  // Check for placeholder config on mount
  useEffect(() => {
      if (firebaseConfig.apiKey === "INSERT_YOUR_API_KEY_HERE") {
          setConfigError(true);
      }
  }, []);

  const getErrorMessage = (err: any) => {
      console.error("Auth Error:", err);
      if (err.code === 'auth/configuration-not-found') {
          setSetupGuide({
            title: "Google Sign-In Not Enabled",
            steps: [
                "Go to Firebase Console > Build > Authentication > Sign-in method",
                "Click 'Add new provider'",
                "Select 'Google'",
                "Toggle 'Enable' to ON",
                "Enter a 'Project Support Email' (required)",
                "Click 'Save'"
            ]
          });
          return "Provider not enabled in Firebase Console.";
      }
      if (err.code === 'auth/operation-not-allowed') {
          setSetupGuide({
            title: "Email/Password Sign-In Not Enabled",
            steps: [
                "Go to Firebase Console > Build > Authentication > Sign-in method",
                "Click 'Add new provider' (or edit Email/Password)",
                "Select 'Email/Password'",
                "Toggle 'Enable' to ON",
                "Click 'Save'"
            ]
          });
          return "Email/Password provider not enabled in Firebase Console.";
      }
      if (err.code === 'auth/unauthorized-domain') {
          setSetupGuide({
            title: "Domain Not Authorized",
            steps: [
                "Go to Firebase Console > Build > Authentication > Settings",
                "Select the 'Authorized domains' tab",
                "Click 'Add domain'",
                `Enter this domain: ${window.location.hostname}`,
                "Click 'Add'"
            ]
          });
          return "Current domain is not authorized for OAuth operations.";
      }
      if (err.code === 'auth/invalid-api-key') return "Invalid API Key. Please update services/firebase.ts with the key from Project Settings.";
      if (err.code === 'auth/invalid-credential') return "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') return "This email is already registered.";
      if (err.code === 'auth/weak-password') return "Password should be at least 6 characters.";
      if (err.code === 'auth/popup-closed-by-user') return "Sign-in popup was closed.";
      if (err.code === 'auth/network-request-failed') return "Network error. Check your connection or firewall.";
      if (err.message && err.message.includes("auth/api-key-not-valid")) return "API Key is invalid. Check services/firebase.ts";
      
      setSetupGuide(null);
      return err.message || "Authentication failed. Check console.";
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSetupGuide(null);
    setLoading(true);

    try {
      if (!auth) throw new Error("Firebase not initialized. Check services/firebase.ts");
      
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setSetupGuide(null);
    setLoading(true);
    try {
      if (!auth || !googleProvider) throw new Error("Firebase not initialized");
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
       setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (configError) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border-t-4 border-yellow-500">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-yellow-100 rounded-full text-yellow-700">
                          <Settings className="w-6 h-6" />
                      </div>
                      <h1 className="text-xl font-bold text-gray-900">Configuration Required</h1>
                  </div>
                  
                  <div className="space-y-4 text-gray-600 text-sm">
                      <p>The application is running, but it needs your Firebase API Key to function.</p>
                      
                      <ol className="list-decimal pl-5 space-y-2">
                          <li>Open <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono">services/firebase.ts</code></li>
                          <li>Locate the <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">firebaseConfig</code> object.</li>
                          <li>Replace <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">"INSERT_YOUR_API_KEY_HERE"</code> with your actual Web API Key.</li>
                      </ol>

                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h4 className="font-semibold text-blue-800 mb-1 flex items-center">
                              Where to find the key?
                              <ExternalLink className="w-3 h-3 ml-1" />
                          </h4>
                          <p className="text-blue-700">
                              Go to Firebase Console &gt; Project Overview &gt; Project Settings &gt; General &gt; Your Apps.
                          </p>
                      </div>
                  </div>
                  
                  <button onClick={() => window.location.reload()} className="mt-8 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                      I've Updated the File (Reload)
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full transition-all duration-300">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">IN</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to InNews</h1>
          <p className="text-gray-500 mt-2">{isLogin ? 'Sign in to your account' : 'Create your account'}</p>
        </div>

        {setupGuide ? (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4" />
                    {setupGuide.title}
                </h3>
                <ol className="space-y-2">
                    {setupGuide.steps.map((step, idx) => (
                        <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                            <span className="font-mono font-bold text-xs mt-0.5 bg-blue-200 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                            {step}
                        </li>
                    ))}
                </ol>
                <button 
                    onClick={() => setSetupGuide(null)} 
                    className="mt-4 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                    I've Authorized It, Try Again
                </button>
            </div>
        ) : error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Authentication Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!setupGuide && (
            <div className="space-y-6">
            <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors group"
            >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="you@company.com"
                    />
                </div>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                    />
                </div>
                </div>

                <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                {loading ? (
                    'Processing...'
                ) : (
                    <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
                </button>
            </form>
            </div>
        )}

        {!setupGuide && (
            <div className="mt-6 text-center">
            <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            </div>
        )}
      </div>
    </div>
  );
};