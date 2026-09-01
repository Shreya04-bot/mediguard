import { useEffect, useRef, useState } from "react";

/**
 * Simple second-resolution countdown, used to gate "Resend OTP" buttons.
 *
 * @param {number} seconds - initial countdown length
 * @returns {{
 *   remaining: number,
 *   isActive: boolean,
 *   start: (seconds?: number) => void,
 * }}
 */
export function useCountdown(seconds = 0) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [remaining > 0]);

  const start = (next = seconds) => setRemaining(next);

  return { remaining, isActive: remaining > 0, start };
}
