export default function Loading() {
  return (
    <div style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header skeleton */}
      <div style={{ height: '52px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '24px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: '80px', background: 'var(--surface)', borderRadius: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      {/* Content skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: '52px', background: 'var(--surface)', borderRadius: '8px', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite', opacity: 1 - i * 0.15 }} />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
