import { Suspense } from 'react';
import LoginCard from './LoginCard';

export const metadata = {
  title: 'Sign in · Bespoke Social',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
