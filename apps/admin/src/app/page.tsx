'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) router.replace('/dashboard');
    else router.replace('/login');
  }, [router]);
  return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
}
