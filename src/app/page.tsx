export const revalidate = 60;

export default function Home() {
  return (
    <main>
      <h1>Loop</h1>
      <p>Starter Next.js app configured for Vercel deployment.</p>
      <ul>
        <li>Incremental static regeneration every 60 seconds.</li>
        <li>API routes run as serverless functions.</li>
        <li>Public assets are cached aggressively at the edge.</li>
      </ul>
    </main>
  );
}
