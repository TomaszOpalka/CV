import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ display: 'grid', placeContent: 'center', minHeight: '100svh', gap: '1rem' }}>
      <h1>404</h1>
      <Link href="/">Wróć na stronę główną</Link>
    </main>
  );
}
