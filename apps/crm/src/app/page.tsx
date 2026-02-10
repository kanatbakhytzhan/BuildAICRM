'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (token) router.replace('/leads');
    else router.replace('/login');
  }, [mounted, router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      Загрузка...
    </div>
  );
}
