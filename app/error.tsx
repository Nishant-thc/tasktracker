'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', textAlign: 'center', padding: '24px',
    }}>
      <div>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ fontSize: '22px', margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ color: 'var(--faint)', margin: '0 0 8px', fontSize: '14px' }}>{error.message}</p>
        <button className="btn" onClick={reset} style={{ marginTop: '16px' }}>Try Again</button>
      </div>
    </div>
  );
}
