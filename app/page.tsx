import { withAuth } from '@workos-inc/authkit-nextjs';
import HomePageClient from './home-client';
import { AuthProvider } from '@/lib/auth-context';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { user } = await withAuth();

  return (
    <AuthProvider initialUser={user}>
      <HomePageClient />
    </AuthProvider>
  );
}
