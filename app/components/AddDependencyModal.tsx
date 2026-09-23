'use client';

import React, { useState } from 'react';

type AddDependencyModalProps = {
  projectId: string;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export default function AddDependencyModal({ projectId, onClose, onSubmit }: AddDependencyModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [impactScore, setImpactScore] = useState(3);
  const [uplift, setUplift] = useState('');
  const [desc, setDesc] = useState('');
  const [impact, setImpact] = useState('');
  const [links, setLinks] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) return alert('Title is required');

    setSubmitting(true);
    try {
      await onSubmit({
        projectId,
        title,
        category: category.trim() || null,
        priority,
        impactScore,
        estimatedUpliftPct: parseFloat(uplift) || 0,
        description: desc,
        impactIfDelayed: impact,
        links: links.split('\n').map((l) => l.trim()).filter(Boolean),
        dueDate: dueDate || null,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to add dependency');
      setSubmitting(false);
    }
  };

  return (
    <div className="ov open" role="dialog" aria-modal="true">
      <div className="dlg" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 0, fontSize: '18px', fontWeight: 600,
            color: 'var(--faint)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
        <h2>Add dependency</h2>
        <p className="sub2">Log a new change required from the client.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="f">
            <label htmlFor="dT">Task title</label>
            <input
              type="text"
              id="dT"
              placeholder="e.g. Fix canonical tags on category pages"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="f">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="f">
              <label>Impact Score (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={impactScore}
                onChange={(e) => setImpactScore(parseInt(e.target.value) || 3)}
              />
            </div>
            <div className="f">
              <label>Category</label>
              <input
                type="text"
                list="category-suggestions"
                placeholder="e.g. Tech, Content"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id="category-suggestions">
                <option value="Tech" />
                <option value="Content" />
                <option value="Design" />
                <option value="SEO" />
              </datalist>
            </div>
            <div className="f">
              <label>Due Date <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="f">
            <label>Estimated Organic Uplift (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 5.5"
              value={uplift}
              onChange={(e) => setUplift(e.target.value)}
            />
          </div>

          <div className="f">
            <label>What to do (Description)</label>
            <textarea
              rows={3}
              placeholder="Explain exactly what needs to be implemented..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="f">
            <label>If it waits (Impact if delayed)</label>
            <textarea
              rows={2}
              placeholder="What happens if the client doesn't do this?"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            />
          </div>

          <div className="f">
            <label>Supporting Links (one per line)</label>
            <textarea
              rows={2}
              placeholder="https://docs.google.com/..."
              value={links}
              onChange={(e) => setLinks(e.target.value)}
            />
          </div>

          <div className="acts">
            <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add dependency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
