'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import styles from './login.module.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginCard() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  const errorParam = params.get('error');
  const errorMessage =
    errorParam === 'domain'
      ? 'That Google account is not a @bespokelabs.ai account. Sign in with your work email.'
      : errorParam === 'oauth'
      ? 'Google sign-in failed. Try again.'
      : null;

  const signIn = async () => {
    if (!configured || busy) return;
    setBusy(true);
    const supabase = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          // Hints Google's picker toward the workspace; the middleware
          // and callback still verify the domain server-side.
          hd: 'bespokelabs.ai',
          prompt: 'select_account',
        },
      },
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark}>BA</span>
          <span className={styles.eyebrow}>Bespoke Labs presents</span>
        </div>
        <h1 className={styles.title}>Bespoke Social</h1>
        <p className={styles.sub}>
          Daily word games, photo challenges, and a robotic goat who takes
          all of it far too seriously.
        </p>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        {configured ? (
          <button
            className={`btn btn-primary btn-lg ${styles.googleBtn}`}
            onClick={signIn}
            disabled={busy}
            id="login-google"
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden>
              <path fill="#fff" d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a5.9 5.9 0 1 1 0-11.8c1.5 0 2.85.55 3.9 1.45l2.15-2.15A8.9 8.9 0 1 0 12 20.9c4.45 0 8.55-3.2 8.55-8.9 0-.3-.05-.6-.1-.9Z"/>
            </svg>
            {busy ? 'Opening Google…' : 'Sign in with Google'}
          </button>
        ) : (
          <Link className="btn btn-primary btn-lg" href="/" id="login-demo">
            Enter demo mode →
          </Link>
        )}

        <p className={styles.note}>
          {configured
            ? 'Only @bespokelabs.ai accounts can enter.'
            : 'Supabase isn’t configured yet, so sign-in is disabled and the Arcade runs on demo data.'}
        </p>
      </div>

      <p className={styles.footer}>
        Points are real. The stakes are not. The commentary is merciless.
      </p>
    </div>
  );
}
