import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import { initOneSignal } from '../lib/onesignal';
import { DataProvider } from '../lib/DataContext';

function MyApp({ Component, pageProps }: AppProps) {
  // Initialize OneSignal and register service worker
  useEffect(() => {
    // Initialize OneSignal for push notifications
    initOneSignal();

    // Register our service worker as fallback
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service worker registration failed:', err);
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Loop - Habit Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f0a1f" />
        <meta name="description" content="Track your daily habits with the floor/base/bonus tier system" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </Head>
      <DataProvider>
        <Component {...pageProps} />
      </DataProvider>
    </>
  );
}

export default MyApp;
