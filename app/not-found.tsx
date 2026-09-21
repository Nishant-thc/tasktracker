import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', textAlign: 'center', padding: '24px',
    }}>
      <div>
        <div style={{ fontSize: '72px', fontWeight: 800, color: 'var(--hi)', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '24px', margin: '16px 0 8px' }}>Page not found</h1>
        <p style={{ color: 'var(--faint)', margin: '0 0 28px' }}>
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/" className="btn" style={{ textDecoration: 'none' }}>Go Home</Link>
      </div>
    </div>
  );
}
