'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Sign in failed');
        return;
      }

      const from = searchParams.get('from');
      router.push(from && from !== '/login' ? from : '/');
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-ambient" aria-hidden>
        <span className="login-orb login-orb-royal" />
        <span className="login-orb login-orb-gold" />
      </div>

      <div className="login-card">
        <div className="login-card-header">
          <BrandLogo />
          <p className="login-eyebrow">SOC + STOS Command Center</p>
        </div>

        <div className="login-card-body">
          <div className="login-intro">
            <h1 className="login-title">Operations Dashboard</h1>
            <p className="login-subtitle">
              Executive view of KPIs, actions, and client operations
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="login-label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="you@company.com"
              required
            />
            </label>

            <label className="login-field">
              <span className="login-label">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="Enter password"
                required
              />
            </label>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="login-footnote">
            <ShieldCheck size={13} className="login-footnote-icon" />
            <span>Authorized team access only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
