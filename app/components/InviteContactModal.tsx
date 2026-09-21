'use client';

import React, { useState } from 'react';
import { createClientContact } from '@/app/actions/taskActions';

type InviteContactModalProps = {
  projectId: string;
  projectToken: string;
  onClose: () => void;
};

export default function InviteContactModal({ projectId, projectToken, onClose }: InviteContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('contributor');
  const [submitting, setSubmitting] = useState(false);
  const [successLink, setSuccessLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !email.trim()) return alert('Name and email are required');

    setSubmitting(true);
    try {
      await createClientContact({
        projectId,
        name,
        email,
        role,
      });
      // In a real app, this would send an email. For this local prototype, we just show the link.
      setSuccessLink(`${window.location.origin}/c/${projectToken}`);
    } catch (err) {
      console.error(err);
      alert('Failed to add contact');
      setSubmitting(false);
    }
  };

  return (
    <div className="ov open" role="dialog" aria-modal="true">
      <div className="dlg">
        <h2>Invite client contact</h2>
        
        {successLink ? (
          <div>
            <p className="sub2">Contact added successfully! In a production environment, they would receive a magic link email.</p>
            <p>For testing, here is their access link:</p>
            <div className="f" style={{ marginTop: '12px' }}>
              <input type="text" readOnly value={successLink} onClick={(e) => (e.target as HTMLInputElement).select()} />
            </div>
            <div className="acts" style={{ marginTop: '24px' }}>
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <p className="sub2">Give a client access to this tracker.</p>
            <form onSubmit={handleSubmit}>
              <div className="f">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="f">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="e.g. jane@client.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="f">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="contributor">Contributor (Can start/mark tasks)</option>
                  <option value="viewer">Viewer (Read only)</option>
                </select>
              </div>

              <div className="acts">
                <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Inviting...' : 'Send invite'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
