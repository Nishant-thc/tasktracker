'use client';

import React, { useState } from 'react';

type Task = {
  id: string;
  title: string;
  category?: string | null;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  description?: string | null;
  impactIfDelayed?: string | null;
  links?: string | null;
  dueDate?: Date | string | null;
};

type EditDependencyModalProps = {
  task: Task;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export default function EditDependencyModal({ task, onClose, onSubmit }: EditDependencyModalProps) {
  const [title, setTitle] = useState(task.title || '');
  const [category, setCategory] = useState(task.category || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [impactScore, setImpactScore] = useState(task.impactScore || 3);
  const [uplift, setUplift] = useState(task.estimatedUpliftPct ? String(task.estimatedUpliftPct) : '');
  const [desc, setDesc] = useState(task.description || '');
  const [impact, setImpact] = useState(task.impactIfDelayed || '');

  // Format existing links JSON or string
  const existingLinksString = (() => {
    if (!task.links) return '';
    try {
      const parsed = JSON.parse(task.links);
      if (Array.isArray(parsed)) return parsed.join('\n');
    } catch (e) {
      return task.links;
    }
    return '';
  })();

  const [links, setLinks] = useState(existingLinksString);

  // Format existing due date (YYYY-MM-DD)
  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().split('T')[0]
    : '';
  const [dueDate, setDueDate] = useState(formattedDueDate);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) return alert('Title is required');

    setSubmitting(true);
    try {
      await onSubmit({
        taskId: task.id,
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
      alert('Failed to update task');
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

        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Edit Dependency</h2>
        <p className="sub2" style={{ color: 'var(--faint)', fontSize: '13px', margin: '0 0 16px' }}>
          Update task details, impact metrics, or attached links.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="f" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="f">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="f">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Impact Score (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={impactScore}
                onChange={(e) => setImpactScore(parseInt(e.target.value) || 3)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              />
            </div>
            <div className="f">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Category</label>
              <input
                type="text"
                list="category-suggestions"
                placeholder="e.g. Tech, Content"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              />
              <datalist id="category-suggestions">
                <option value="Tech" />
                <option value="Content" />
                <option value="Design" />
                <option value="SEO" />
                <option value="PPC" />
                <option value="CRO" />
              </datalist>
            </div>
            <div className="f">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              />
            </div>
          </div>

          <div className="f" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Estimated Organic Uplift (%)</label>
            <input
              type="number"
              step="0.1"
              value={uplift}
              onChange={(e) => setUplift(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
            />
          </div>

          <div className="f" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>What to do (Description)</label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
            />
          </div>

          <div className="f" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>If it waits (Impact if delayed)</label>
            <textarea
              rows={2}
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
            />
          </div>

          <div className="f" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Supporting Links (one URL per line)</label>
            <textarea
              rows={2}
              placeholder="https://docs.google.com/..."
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
            />
          </div>

          <div className="acts" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
