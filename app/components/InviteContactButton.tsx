'use client';

import React, { useState } from 'react';
import InviteContactModal from './InviteContactModal';

export default function InviteContactButton({ projectId, projectToken }: { projectId: string, projectToken: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn" onClick={() => setIsOpen(true)}>
        Invite contact
      </button>

      {isOpen && (
        <InviteContactModal
          projectId={projectId}
          projectToken={projectToken}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
