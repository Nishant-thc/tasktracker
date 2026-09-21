'use client';

import React, { useState } from 'react';

export default function ShareLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/c/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button className="btn ghost sm" onClick={handleShare} style={{ marginLeft: '8px' }}>
      {copied ? 'Copied!' : '🔗 Share Link'}
    </button>
  );
}
