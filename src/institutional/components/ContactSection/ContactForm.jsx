import { useCallback, useRef, useState } from 'react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import Turnstile from './Turnstile';
import styles from './ContactForm.module.css';

/*
 * WIRING: set `VITE_CONTACT_ENDPOINT` to the URL that accepts the submission
 * (it must verify the Turnstile token server-side with your SECRET key). While
 * it is unset the form simulates a successful send and logs the payload.
 */
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || '';

export default function ContactForm() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle'); // idle | sending | success | error | captcha
  const tokenRef = useRef('');
  const turnstileRef = useRef(null);

  const handleVerify = useCallback((token) => {
    tokenRef.current = token;
  }, []);
  const handleExpire = useCallback(() => {
    tokenRef.current = '';
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === 'sending') return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: (data.get('name') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      company: (data.get('company') || '').toString().trim(),
      message: (data.get('message') || '').toString().trim(),
      turnstileToken: tokenRef.current,
    };

    if (!payload.turnstileToken) {
      setStatus('captcha');
      return;
    }

    setStatus('sending');
    try {
      if (ENDPOINT) {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Request failed');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
        console.info('[contact] payload ready to send:', payload);
      }
      setStatus('success');
      form.reset();
      tokenRef.current = '';
      turnstileRef.current?.reset();
    } catch {
      setStatus('error');
      tokenRef.current = '';
      turnstileRef.current?.reset();
    }
  }

  const statusMessage =
    status === 'success'
      ? t.contact.success
      : status === 'error'
        ? t.contact.error
        : status === 'captcha'
          ? t.contact.captchaRequired
          : '';

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-name">
          {t.contact.nameLabel}
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          className={styles.input}
          placeholder={t.contact.namePlaceholder}
          autoComplete="name"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-email">
          {t.contact.emailLabel}
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          className={styles.input}
          placeholder={t.contact.emailPlaceholder}
          autoComplete="email"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-company">
          {t.contact.companyLabel}{' '}
          <span className={styles.optional}>{t.contact.companyOptional}</span>
        </label>
        <input
          id="contact-company"
          name="company"
          type="text"
          className={styles.input}
          placeholder={t.contact.companyPlaceholder}
          autoComplete="organization"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-message">
          {t.contact.messageLabel}
        </label>
        <textarea
          id="contact-message"
          name="message"
          className={`${styles.input} ${styles.textarea}`}
          placeholder={t.contact.messagePlaceholder}
          rows={4}
          required
        />
      </div>

      <Turnstile
        ref={turnstileRef}
        onVerify={handleVerify}
        onExpire={handleExpire}
      />

      {statusMessage && (
        <p
          className={
            status === 'success' ? styles.statusSuccess : styles.statusError
          }
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}

      <button
        type="submit"
        className={styles.submit}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? t.contact.sending : t.contact.submit}
      </button>
    </form>
  );
}
