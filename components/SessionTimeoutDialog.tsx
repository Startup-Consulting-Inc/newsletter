import React, { useEffect } from 'react';
import { AlertTriangle, Clock, LogOut, CheckCircle } from 'lucide-react';

interface SessionTimeoutDialogProps {
    isOpen: boolean;
    remainingTime: number;
    onExtendSession: () => void;
    onLogout: () => void;
}

export function SessionTimeoutDialog({
    isOpen,
    remainingTime,
    onExtendSession,
    onLogout
}: SessionTimeoutDialogProps) {
    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                onExtendSession();
            } else if (e.key === 'Escape') {
                onLogout();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onExtendSession, onLogout]);

    if (!isOpen) return null;

    const isUrgent = remainingTime < 30;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeout-title"
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
                <div className={`p-6 ${isUrgent ? 'bg-red-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-full ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 id="timeout-title" className="text-xl font-bold text-gray-900">
                                Session Timeout Warning
                            </h2>
                            <p className="text-gray-600">
                                Your session will expire soon due to inactivity.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-6">
                        <div className={`text-4xl font-mono font-bold mb-2 ${isUrgent ? 'text-red-600' : 'text-gray-800'}`}>
                            {formatTime(remainingTime)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>until automatic logout</span>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={onLogout}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out Now
                        </button>

                        <button
                            onClick={onExtendSession}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Stay Logged In
                        </button>
                    </div>

                    <div className="mt-4 text-xs text-center text-gray-400">
                        Press <strong>Enter</strong> to stay logged in
                    </div>
                </div>
            </div>
        </div>
    );
}
