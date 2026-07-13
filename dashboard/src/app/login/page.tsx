import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card login-card-loading">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
