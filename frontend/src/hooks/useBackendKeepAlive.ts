import { useEffect, useRef } from 'react';

const THIRTEEN_MINUTES_MS = 13 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useBackendKeepAlive() {
  const lastPingRef = useRef<number>(Date.now());

  useEffect(() => {
    const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const healthUrl = `${rawApiUrl}/health`;

    const sendPing = async () => {
      try {
        lastPingRef.current = Date.now();
        await fetch(healthUrl, {
          method: 'GET',
          keepalive: true,
          cache: 'no-store',
        });
      } catch {
        // Silently swallow errors to avoid interrupting the user interface
      }
    };

    // 1. Initial warm-up ping on mount
    sendPing();

    // 2. Periodic background ping every 13 minutes (before 15-minute Render sleep threshold)
    const intervalId = setInterval(sendPing, THIRTEEN_MINUTES_MS);

    // 3. Tab focus / visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastPing = Date.now() - lastPingRef.current;
        if (timeSinceLastPing > TEN_MINUTES_MS) {
          sendPing();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
