'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // В dev-режиме отключаем sw и чистим старые регистрации,
    // чтобы не ловить битые hot-update чанки вроде "./819.js".
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => {
            reg.unregister().catch(() => {});
          });
        })
        .catch(() => {});
      return;
    }

    // В проде включаем PWA.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
