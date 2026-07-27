import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import styles from './ContactForm.module.css';

/*
 * Cloudflare Turnstile widget (client side only).
 *
 * WIRING: set `VITE_TURNSTILE_SITE_KEY` in your `.env`. The fallback below is
 * Cloudflare's public "always passes" TEST key so the widget works in dev —
 * replace it in production. The matching SECRET key must be used to verify the
 * token server-side, on the backend that receives the form submission.
 */
const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;
function loadTurnstile() {
  if (typeof window !== 'undefined' && window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

const Turnstile = forwardRef(function Turnstile({ onVerify, onExpire }, ref) {
  const hostRef = useRef(null);
  const widgetId = useRef(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current != null && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(hostRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onVerify?.(token),
          'expired-callback': () => onExpire?.(),
          'error-callback': () => onExpire?.(),
        });
      })
      .catch(() => {
        /* network/blocked — form guards against a missing token on submit */
      });

    return () => {
      cancelled = true;
      if (widgetId.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* already gone */
        }
      }
    };
  }, [onVerify, onExpire]);

  return <div ref={hostRef} className={styles.turnstile} />;
});

export default Turnstile;
