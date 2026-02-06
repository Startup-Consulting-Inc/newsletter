import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutReturn {
    showWarning: boolean;
    remainingTime: number;
    extendSession: () => void;
}

export function useSessionTimeout(
    timeout: number,        // Total session time in ms (e.g., 30 min)
    warningBefore: number,  // Warning duration in ms (e.g., 2 min)
    onTimeout: () => void
): UseSessionTimeoutReturn {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    // Refs to store timer IDs and timestamps
    const activityTimer = useRef<NodeJS.Timeout | null>(null);
    const warningTimer = useRef<NodeJS.Timeout | null>(null);
    const countdownInterval = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTime = useRef<number>(Date.now());
    const lastEventTime = useRef<number>(0); // For throttling

    const clearAllTimers = useCallback(() => {
        if (activityTimer.current) clearTimeout(activityTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
    }, []);

    const startWarningTimer = useCallback(() => {
        // Calculate remaining time for the warning phase
        const warningDurationSeconds = Math.floor(warningBefore / 1000);
        setRemainingTime(warningDurationSeconds);
        setShowWarning(true);

        // Start countdown
        countdownInterval.current = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    if (countdownInterval.current) clearInterval(countdownInterval.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Set final timeout
        warningTimer.current = setTimeout(() => {
            clearAllTimers();
            onTimeout();
        }, warningBefore);
    }, [warningBefore, onTimeout, clearAllTimers]);

    const resetActivity = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        lastActivityTime.current = Date.now();

        // Set timer to trigger warning
        const timeUntilWarning = timeout - warningBefore;

        // Safety check
        if (timeUntilWarning <= 0) {
            // If timeout is shorter than warning, just start warning immediately or handle edge case
            startWarningTimer();
            return;
        }

        activityTimer.current = setTimeout(() => {
            startWarningTimer();
        }, timeUntilWarning);
    }, [timeout, warningBefore, clearAllTimers, startWarningTimer]);

    const handleActivity = useCallback(() => {
        const now = Date.now();
        // Throttle events: only process if 5 seconds have passed since last processed event
        if (now - lastEventTime.current < 5000) {
            return;
        }
        lastEventTime.current = now;

        // Only reset if we are NOT in warning state
        // If we are in warning state, user must explicitly click "Stay Logged In"
        // Wait, requirements say: "Activity Detection: Any user interaction (mouse, keyboard) resets timer"
        // But usually for warning dialogs, you might want explicit action, OR implicit.
        // The plan says: "Activity Reset: Move mouse during warning → verify dialog dismisses"
        // So implicit reset is required.

        // However, if the dialog is open, we might want to be careful.
        // Let's follow the plan: "Activity Detection: Any user interaction (mouse, keyboard) resets timer"
        // And "Activity Reset: Move mouse during warning → verify dialog dismisses"

        // So yes, any activity resets everything.
        resetActivity();
    }, [resetActivity]);

    const extendSession = useCallback(() => {
        resetActivity();
    }, [resetActivity]);

    // Setup event listeners
    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

        // Initial start
        resetActivity();

        const eventHandler = () => handleActivity();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, eventHandler);
        });

        // Page Visibility API
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const timeElapsed = now - lastActivityTime.current;

                if (timeElapsed >= timeout) {
                    // Time exceeded while away
                    clearAllTimers();
                    onTimeout();
                } else if (timeElapsed >= (timeout - warningBefore)) {
                    // We should be in warning state
                    // Calculate how much of the warning time is left
                    const timeInWarning = timeElapsed - (timeout - warningBefore);
                    const remainingWarning = warningBefore - timeInWarning;

                    if (remainingWarning > 0) {
                        // Clear existing timers and jump straight to warning state with adjusted time
                        clearAllTimers();

                        // We need to start warning with reduced time
                        const warningDurationSeconds = Math.floor(remainingWarning / 1000);
                        setRemainingTime(warningDurationSeconds);
                        setShowWarning(true);

                        countdownInterval.current = setInterval(() => {
                            setRemainingTime((prev) => {
                                if (prev <= 1) {
                                    if (countdownInterval.current) clearInterval(countdownInterval.current);
                                    return 0;
                                }
                                return prev - 1;
                            });
                        }, 1000);

                        warningTimer.current = setTimeout(() => {
                            clearAllTimers();
                            onTimeout();
                        }, remainingWarning);
                    } else {
                        // Should have timed out
                        clearAllTimers();
                        onTimeout();
                    }
                } else {
                    // Still in safe zone, but we need to adjust the activity timer
                    // The simplest way is to just let the existing timer run, 
                    // BUT the existing timer might be paused by the browser or drifting.
                    // It's safer to recalculate.

                    clearAllTimers();
                    const timeUntilWarning = timeout - warningBefore - timeElapsed;
                    activityTimer.current = setTimeout(() => {
                        startWarningTimer();
                    }, timeUntilWarning);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearAllTimers();
            events.forEach(event => {
                window.removeEventListener(event, eventHandler);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [timeout, warningBefore, onTimeout, handleActivity, resetActivity, clearAllTimers, startWarningTimer]);

    return {
        showWarning,
        remainingTime,
        extendSession
    };
}
