'use client';

import React, { useState } from 'react';
import AddDependencyModal from './AddDependencyModal';
import { createDependency } from '@/app/actions/taskActions';

export default function AddDependencyButton({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn" onClick={() => setIsOpen(true)}>
        Add dependency
      </button>

      {isOpen && (
        <AddDependencyModal
          projectId={projectId}
          onClose={() => setIsOpen(false)}
          onSubmit={async (data) => { await createDependency(data); }}
        />
      )}
    </>
  );
}
