import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  // Register service worker
  useEffect(() => {
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
        <meta name="theme-color" content="#6366f1" />
        <meta name="description" content="Track your daily habits with the floor/base/bonus tier system" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
