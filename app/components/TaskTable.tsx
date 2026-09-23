'use client';

import React, { useState, useEffect } from 'react';
import EditDependencyModal from './EditDependencyModal';
import { updateDependency } from '@/app/actions/taskActions';

export type Task = {
  id: string;
  title: string;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  status: string;
  description: string | null;
  category: string | null;
  impactIfDelayed: string | null;
  links: string | null; // JSON array
  createdAt: Date;
  startedAt: Date | null;
  qcAt: Date | null;
  closedAt: Date | null;
  dueDate: Date | null;
  reworkCount: number;
  sentBackNote: string | null;
};

type TaskTableProps = {
  tasks: Task[];
  role: 'agency' | 'client';
  clientName: string;
  agencyName: string;
  onAction?: (taskId: string, action: string, note?: string) => void;
};

const P: Record<string, { short: string; c: string; s: string; r: number }> = {
  high: { short: 'High', c: '--hi', s: '--hi-soft', r: 3 },
  medium: { short: 'Medium', c: '--md', s: '--md-soft', r: 2 },
  low: { short: 'Low', c: '--lo', s: '--lo-soft', r: 1 },
};

const ST: Record<string, { label: string; c: string }> = {
  pending: { label: 'Not started', c: '--s-pend' },
  in_progress: { label: 'In progress', c: '--s-prog' },
  qc: { label: 'Awaiting QC', c: '--s-qc' },
  closed: { label: 'Closed', c: '--s-done' },
};

const ORDER = ['pending', 'in_progress', 'qc', 'closed'];
const STEPNAMES = ['Raised', 'In progress', 'QC', 'Closed'];

const DAY = 864e5;

function days(a: number, b: number) {
  return Math.max(0, Math.floor((b - a) / DAY));
}

function fmt(d: Date | number | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function sev(d: number) {
  return d >= 14 ? 'sev3' : d >= 7 ? 'sev2' : '';
}

export default function TaskTable({ tasks, role, clientName, agencyName, onAction }: TaskTableProps) {
  const [filter, setFilter] = useState('active');
  const [openTasks, setOpenTasks] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortStrategy, setSortStrategy] = useState('oldest');
  
  // Note modal state
  const [sendBackId, setSendBackId] = useState<string | null>(null);
  const [sendBackNote, setSendBackNote] = useState('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const now = Date.now();

  const toggleTask = (id: string) => {
    const isOpening = !openTasks[id];
    setOpenTasks((prev) => ({ ...prev, [id]: isOpening }));

    if (isOpening) {
      window.location.hash = `task-${id}`;
    } else if (window.location.hash === `#task-${id}`) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash.startsWith('#task-')) {
        const id = window.location.hash.replace('#task-', '');
        setOpenTasks(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
          const el = document.getElementById(`task-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const hasOpen = Object.values(openTasks).some(v => v);

  const lastActivity = (t: Task) => Math.max(
    t.createdAt.getTime(),
    t.startedAt?.getTime() || 0,
    t.qcAt?.getTime() || 0,
    t.closedAt?.getTime() || 0
  );

  let filteredTasks = tasks.filter((t) => {
    if (filter === 'active' && t.status === 'closed') return false;
    if (filter === 'client' && !(t.status === 'pending' || t.status === 'in_progress')) return false;
    if (filter === 'qc' && t.status !== 'qc') return false;
    if (filter === 'closed' && t.status !== 'closed') return false;
    
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  filteredTasks.sort((a, b) => {
    switch (sortStrategy) {
      case 'oldest':
        return a.createdAt.getTime() - b.createdAt.getTime();
      case 'priority': {
        const prA = P[a.priority]?.r || P.medium.r;
        const prB = P[b.priority]?.r || P.medium.r;
        return prB - prA || (a.createdAt.getTime() - b.createdAt.getTime());
      }
      case 'impact':
        return (b.impactScore - a.impactScore) || ((b.estimatedUpliftPct || 0) - (a.estimatedUpliftPct || 0));
      case 'updated':
        return lastActivity(b) - lastActivity(a);
      default:
        return 0;
    }
  });

  const fStats = [
    { id: 'active', label: 'All open', count: tasks.filter(t => t.status !== 'closed').length },
    { id: 'client', label: `With ${clientName}`, count: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length },
    { id: 'qc', label: 'Awaiting QC', count: tasks.filter(t => t.status === 'qc').length },
    { id: 'closed', label: 'Closed', count: tasks.filter(t => t.status === 'closed').length },
  ];

  return (
    <>
      <div className="bar">
        <div className="chips">
          {fStats.map((st) => (
            <button
              key={st.id}
              className={filter === st.id ? 'on' : ''}
              onClick={() => setFilter(st.id)}
            >
              {st.label} <span>{st.count}</span>
            </button>
          ))}
        </div>
        <input
          className="in"
          type="search"
          placeholder="Search tasks"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search tasks"
        />
        <select
          className="in"
          value={sortStrategy}
          onChange={(e) => setSortStrategy(e.target.value)}
          aria-label="Sort tasks"
        >
          <option value="oldest">Oldest first</option>
          <option value="priority">Highest priority</option>
          <option value="impact">Highest impact</option>
          <option value="updated">Recently updated</option>
        </select>
      </div>

      <div className="tbl" role="table">
        <div className="th cols" role="row">
          <div>Task</div>
          <div>Priority</div>
          <div>Impact</div>
          <div>Stage</div>
          <div>Age</div>
          <div>Needed by</div>
          <div></div>
        </div>

        {filteredTasks.length ? (
          filteredTasks.map((t) => {
            const pr = P[t.priority] || P.medium;
            const rIndex = ORDER.indexOf(t.status);
            const isOpen = !!openTasks[t.id];
            let linksArr: string[] = [];
            try {
              linksArr = t.links ? JSON.parse(t.links) : [];
            } catch (e) {}

            const aTime = t.createdAt.getTime();
            const dates = [aTime, t.startedAt?.getTime(), t.qcAt?.getTime(), t.closedAt?.getTime()];

            return (
              <div
                key={t.id}
                id={`task-${t.id}`}
                className="tr cols"
                style={{ 
                  '--pc': `var(${pr.c})`, 
                  '--pcs': `var(${pr.s})`,
                  opacity: hasOpen && !isOpen ? 0.3 : 1,
                  transition: 'opacity 0.2s'
                } as any}
                role="row"
              >
                <div className="c-task">
                  <button className="title" onClick={() => toggleTask(t.id)} aria-expanded={isOpen}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--faint)', marginRight: '6px' }}>
                      {t.id.slice(0, 5).toUpperCase()}
                    </span>
                    {t.title}
                  </button>
                  {t.category && <div style={{ marginTop: '4px' }}><span className="tag">{t.category}</span></div>}
                </div>
                <div>
                  <span className="pri">
                    <i style={{ background: `var(${pr.c})` }}></i>
                    {pr.short}
                  </span>
                </div>
                <div>
                  <div className="meter" style={{ '--pc': `var(${pr.c})` } as any} aria-label={`Impact ${t.impactScore} of 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i key={i} className={i <= t.impactScore ? 'on' : ''}></i>
                    ))}
                  </div>
                  <div className="sub">+{t.estimatedUpliftPct}% est.</div>
                </div>
                <div>
                  <span className="st">
                    <i style={{ background: `var(${ST[t.status].c})` }}></i>
                    {ST[t.status].label}
                  </span>
                  <div className="mini">
                    {ORDER.map((o, i) => (
                      <i key={o} className={i <= rIndex ? 'r' : ''} style={{ '--sc': `var(${ST[o].c})` } as any}></i>
                    ))}
                  </div>
                </div>
                <div>
                  {t.status === 'pending' && (
                    <div className={`cell ${sev(days(aTime, now))}`}>
                      <b>Waiting {days(aTime, now)}d</b>since {fmt(aTime)}
                    </div>
                  )}
                  {t.status === 'in_progress' && (
                    <div className="cell">
                      <b>In progress {days(t.startedAt?.getTime() || aTime, now)}d</b>raised {days(aTime, now)}d ago
                    </div>
                  )}
                  {t.status === 'qc' && (
                    <div className={`cell ${sev(days(t.qcAt?.getTime() || aTime, now))}`}>
                      <b>In QC {days(t.qcAt?.getTime() || aTime, now)}d</b>since {fmt(t.qcAt?.getTime() || aTime)}
                    </div>
                  )}
                  {t.status === 'closed' && (
                    <div className="cell">
                      <b>Closed in {days(aTime, t.closedAt?.getTime() || now)}d</b>on {fmt(t.closedAt)}
                    </div>
                  )}
                </div>
                <div>
                  {!t.dueDate ? (
                    <div className="cell">None</div>
                  ) : t.status !== 'closed' && t.dueDate.getTime() < now ? (
                    <div className="cell sev3">
                      <b>Overdue {days(t.dueDate.getTime(), now)}d</b>{fmt(t.dueDate)}
                    </div>
                  ) : (
                    <div className="cell">
                      <b>{fmt(t.dueDate)}</b>
                    </div>
                  )}
                </div>
                <div className="rowact">
                  {t.status === 'pending' ? (
                    role === 'client' ? (
                      <button className="btn sm" onClick={() => onAction?.(t.id, 'start')}>Start work</button>
                    ) : (
                      <span className="wait">Waiting for {clientName}</span>
                    )
                  ) : t.status === 'in_progress' ? (
                    role === 'client' ? (
                      <button className="btn sm" onClick={() => onAction?.(t.id, 'implement')}>Mark implemented</button>
                    ) : (
                      <span className="wait">{clientName} working</span>
                    )
                  ) : t.status === 'qc' ? (
                    role === 'agency' ? (
                      <>
                        <button className="btn sm" onClick={() => onAction?.(t.id, 'approve')}>Close</button>
                        <button className="btn sm ghost" onClick={() => setSendBackId(t.id)}>Send back</button>
                      </>
                    ) : (
                      <span className="wait">With {agencyName} for QC</span>
                    )
                  ) : (
                    role === 'agency' && (
                      <button className="btn sm ghost" onClick={() => onAction?.(t.id, 'reopen')}>Reopen</button>
                    )
                  )}
                </div>
                {isOpen && (
                  <div className="detail">
                    <div>
                      {t.sentBackNote && t.status === 'in_progress' && (
                        <div className="note-back"><b>Sent back:</b> {t.sentBackNote}</div>
                      )}
                      {t.description && <p><b>What to do.</b> {t.description}</p>}
                      {t.impactIfDelayed && <p><b>If it waits.</b> {t.impactIfDelayed}</p>}
                      <p><b>Estimated effect.</b> +{t.estimatedUpliftPct}% organic sessions once live</p>
                      
                      {linksArr.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--faint)', marginBottom: '6px' }}>
                            Attached Links & Resources:
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {linksArr.map((u, i) => {
                              const icon = u.includes('docs.google.com') ? '📊' : u.includes('figma.com') ? '🎨' : u.includes('drive.google.com') ? '📁' : '🔗';
                              const label = u.includes('docs.google.com') ? 'Google Sheet' : u.includes('figma.com') ? 'Figma Design' : u.includes('drive.google.com') ? 'Drive Asset' : u.replace(/^https?:\/\//, '').split('/')[0];
                              return (
                                <a
                                  key={i}
                                  href={u}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '6px 12px',
                                    backgroundColor: 'var(--surface)',
                                    color: 'var(--ac)',
                                    border: '1.5px solid var(--ac)',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                  }}
                                >
                                  <span>{icon}</span>
                                  <span>{label}</span>
                                  <span style={{ fontSize: '11px', opacity: 0.8 }}>↗</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="tl">
                        {ORDER.map((o, i) => (
                          <div key={o} className={`${i <= rIndex ? 'r' : ''} ${i === rIndex ? ' cur' : ''}`} style={{ '--sc': `var(${ST[o].c})` } as any}>
                            <i></i>
                            <span>
                              {STEPNAMES[i]}<br />
                              {dates[i] ? fmt(dates[i]) : '\u00A0'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {role === 'agency' && (
                        <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button className="btn sm ghost" onClick={() => setEditingTask(t)}>
                            ✏️ Edit Task
                          </button>
                          <button className="btn txt" onClick={() => onAction?.(t.id, 'remove')}>
                            Remove dependency
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty">
            {tasks.length ? 'No tasks match.' : role === 'agency' ? 'No dependencies yet. Add the first one.' : 'Nothing has been raised yet.'}
          </div>
        )}
      </div>

      {editingTask && (
        <EditDependencyModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={async (data) => {
            await updateDependency(data);
            setEditingTask(null);
          }}
        />
      )}

      {sendBackId && (
        <div className="ov open" role="dialog" aria-modal="true">
          <div className="dlg">
            <h2>Send back for rework</h2>
            <p className="sub2">Tell the client what failed QC. The change returns to In progress.</p>
            <div className="f">
              <label htmlFor="nT">What needs fixing</label>
              <textarea
                id="nT"
                placeholder="e.g. Canonicals are missing on page 2 of each category"
                value={sendBackNote}
                onChange={(e) => setSendBackNote(e.target.value)}
              ></textarea>
            </div>
            <div className="acts">
              <button className="btn ghost" onClick={() => { setSendBackId(null); setSendBackNote(''); }}>Cancel</button>
              <button
                className="btn"
                onClick={() => {
                  if (sendBackNote.trim().length < 10) return alert('Note must be at least 10 characters.');
                  onAction?.(sendBackId, 'sendback', sendBackNote);
                  setSendBackId(null);
                  setSendBackNote('');
                }}
              >
                Send back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
