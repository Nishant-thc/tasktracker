'use client';

import React, { useState } from 'react';
import { saveCommunicationConfig } from '@/app/actions/adminActions';

type CommConfig = {
  whatsapp: { enabled: boolean; apiToken: string; phoneNumberId: string; businessAccountId: string };
  slack: { enabled: boolean; webhookUrl: string; botToken: string; defaultChannel: string };
  email: { enabled: boolean; smtpHost: string; smtpPort: string; smtpUser: string; smtpPass: string; fromEmail: string };
};

const DEFAULT_CONFIG: CommConfig = {
  whatsapp: { enabled: false, apiToken: '', phoneNumberId: '', businessAccountId: '' },
  slack: { enabled: false, webhookUrl: '', botToken: '', defaultChannel: '#client-updates' },
  email: { enabled: false, smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', fromEmail: '' },
};

function parseConfig(raw: Record<string, unknown>): CommConfig {
  const base = { ...DEFAULT_CONFIG };
  if (raw.whatsapp && typeof raw.whatsapp === 'object') base.whatsapp = { ...base.whatsapp, ...(raw.whatsapp as object) };
  if (raw.slack && typeof raw.slack === 'object') base.slack = { ...base.slack, ...(raw.slack as object) };
  if (raw.email && typeof raw.email === 'object') base.email = { ...base.email, ...(raw.email as object) };
  // Handle legacy boolean format
  if (typeof raw.whatsapp === 'boolean') base.whatsapp.enabled = raw.whatsapp;
  if (typeof raw.slack === 'boolean') base.slack.enabled = raw.slack;
  if (typeof raw.email === 'boolean') base.email.enabled = raw.email;
  return base;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--ink)', fontSize: '13px', boxSizing: 'border-box',
  fontFamily: 'monospace',
};

const PROVIDERS = [
  {
    key: 'whatsapp' as const,
    label: 'WhatsApp Business API',
    icon: '📱',
    color: '#25d366',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    description: 'Send messages to clients via WhatsApp Cloud API (Meta for Developers)',
    fields: [
      { key: 'apiToken', label: 'Permanent Access Token', placeholder: 'EAAxxxxxxx...', type: 'password' },
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890123', type: 'text' },
      { key: 'businessAccountId', label: 'WhatsApp Business Account ID', placeholder: '9876543210987', type: 'text' },
    ],
  },
  {
    key: 'slack' as const,
    label: 'Slack',
    icon: '💬',
    color: '#4a154b',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    description: 'Post AM notifications and client updates to Slack channels',
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://hooks.slack.com/services/T.../B.../...', type: 'text' },
      { key: 'botToken', label: 'Bot Token (optional, for DMs)', placeholder: 'xoxb-...', type: 'password' },
      { key: 'defaultChannel', label: 'Default Channel', placeholder: '#client-updates', type: 'text' },
    ],
  },
  {
    key: 'email' as const,
    label: 'Email (SMTP)',
    icon: '✉️',
    color: '#2563eb',
    docsUrl: 'https://resend.com/docs/send-with-smtp',
    description: 'Send transactional emails for updates, invites, and notifications via SMTP',
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.resend.com or smtp.gmail.com', type: 'text' },
      { key: 'smtpPort', label: 'SMTP Port', placeholder: '587', type: 'text' },
      { key: 'smtpUser', label: 'SMTP Username', placeholder: 'resend or your@email.com', type: 'text' },
      { key: 'smtpPass', label: 'SMTP Password / API Key', placeholder: 're_xxxxxxxx or your-app-password', type: 'password' },
      { key: 'fromEmail', label: 'From Email Address', placeholder: 'hello@youragency.com', type: 'text' },
    ],
  },
];

export default function AdminIntegrations({
  accountId,
  initialConfig,
}: {
  accountId: string;
  initialConfig: Record<string, unknown>;
}) {
  const [config, setConfig] = useState<CommConfig>(() => parseConfig(initialConfig));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});

  const toggleProvider = (key: 'whatsapp' | 'slack' | 'email') => {
    setConfig(c => ({ ...c, [key]: { ...c[key], enabled: !c[key].enabled } }));
    if (!config[key].enabled) setExpanded(key); // auto-expand when enabling
  };

  const setField = (provider: 'whatsapp' | 'slack' | 'email', field: string, value: string) => {
    setConfig(c => ({ ...c, [provider]: { ...c[provider], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await saveCommunicationConfig(accountId, config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {PROVIDERS.map(({ key, label, icon, color }) => {
          const isEnabled = config[key].enabled;
          return (
            <button
              key={key}
              onClick={() => { toggleProvider(key); setExpanded(prev => prev === key ? null : key); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
                border: `1.5px solid ${isEnabled ? color : 'var(--border)'}`,
                background: isEnabled ? `${color}18` : 'var(--surface)',
                color: isEnabled ? color : 'var(--faint)',
                fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span>{label}</span>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isEnabled ? color : 'var(--border)',
                boxShadow: isEnabled ? `0 0 8px ${color}` : 'none',
                transition: 'all 0.2s',
              }} />
              <span style={{ fontSize: '12px', marginLeft: '2px' }}>{expanded === key ? '▲' : '▼'}</span>
            </button>
          );
        })}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn"
          style={{ marginLeft: 'auto', minWidth: '120px' }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save All'}
        </button>
      </div>

      {PROVIDERS.map(({ key, label, icon, color, docsUrl, description, fields }) => {
        if (expanded !== key) return null;
        return (
          <div key={key} style={{
            border: `1.5px solid ${color}40`,
            borderRadius: '12px',
            marginBottom: '16px',
            overflow: 'hidden',
            background: 'var(--surface)',
          }}>
            <div style={{
              padding: '16px 20px',
              background: `${color}12`,
              borderBottom: `1px solid ${color}30`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <strong style={{ color, fontSize: '15px' }}>{label}</strong>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                    background: config[key].enabled ? `${color}25` : 'var(--bg)',
                    color: config[key].enabled ? color : 'var(--faint)',
                    border: `1px solid ${config[key].enabled ? color : 'var(--border)'}`,
                    fontWeight: 600,
                  }}>
                    {config[key].enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--faint)' }}>{description}</p>
              </div>
              <a href={docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                View Docs ↗
              </a>
            </div>

            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {fields.map(f => (
                <div key={f.key} style={{ gridColumn: f.key === 'webhookUrl' || f.key === 'smtpHost' ? 'span 2' : undefined }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--faint)' }}>
                    {f.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={f.type === 'password' && !showPass[`${key}-${f.key}`] ? 'password' : 'text'}
                      value={(config[key] as any)[f.key] || ''}
                      onChange={e => setField(key, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      style={{ ...inputStyle, paddingRight: f.type === 'password' ? '72px' : '12px' }}
                    />
                    {f.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPass(p => ({ ...p, [`${key}-${f.key}`]: !p[`${key}-${f.key}`] }))}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '11px', color: 'var(--faint)', padding: '4px 6px',
                        }}
                      >
                        {showPass[`${key}-${f.key}`] ? 'Hide' : 'Show'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Setup guide */}
            {key === 'whatsapp' && (
              <div style={{ padding: '0 20px 20px' }}>
                <details>
                  <summary style={{ fontSize: '13px', color: 'var(--faint)', cursor: 'pointer', marginBottom: '8px' }}>
                    📖 How to get your WhatsApp Business API credentials
                  </summary>
                  <ol style={{ fontSize: '13px', color: 'var(--faint)', paddingLeft: '20px', lineHeight: 2 }}>
                    <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color }}>developers.facebook.com</a> → Create App → Business type</li>
                    <li>Add "WhatsApp" product to your app</li>
                    <li>In WhatsApp → API Setup → copy <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong></li>
                    <li>Generate a <strong>Permanent Access Token</strong> via System User in Business Manager</li>
                    <li>Paste all three values above and click Save All</li>
                  </ol>
                </details>
              </div>
            )}
            {key === 'slack' && (
              <div style={{ padding: '0 20px 20px' }}>
                <details>
                  <summary style={{ fontSize: '13px', color: 'var(--faint)', cursor: 'pointer', marginBottom: '8px' }}>
                    📖 How to get your Slack Webhook URL
                  </summary>
                  <ol style={{ fontSize: '13px', color: 'var(--faint)', paddingLeft: '20px', lineHeight: 2 }}>
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" style={{ color }}>api.slack.com/apps</a> → Create New App → From Scratch</li>
                    <li>Choose your workspace → Enable "Incoming Webhooks"</li>
                    <li>Click "Add New Webhook to Workspace" → pick a channel</li>
                    <li>Copy the Webhook URL and paste it above</li>
                    <li>Optionally, create a Bot Token for DMs (OAuth & Permissions → Bot Token Scopes → chat:write)</li>
                  </ol>
                </details>
              </div>
            )}
            {key === 'email' && (
              <div style={{ padding: '0 20px 20px' }}>
                <details>
                  <summary style={{ fontSize: '13px', color: 'var(--faint)', cursor: 'pointer', marginBottom: '8px' }}>
                    📖 Recommended: Use Resend for easy setup
                  </summary>
                  <ol style={{ fontSize: '13px', color: 'var(--faint)', paddingLeft: '20px', lineHeight: 2 }}>
                    <li>Sign up at <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color }}>resend.com</a> → Create API Key</li>
                    <li>SMTP Host: <code>smtp.resend.com</code></li>
                    <li>SMTP Port: <code>587</code></li>
                    <li>SMTP Username: <code>resend</code></li>
                    <li>SMTP Password: your Resend API key (starts with <code>re_</code>)</li>
                    <li>Add your domain in Resend → verify DNS → use <code>you@yourdomain.com</code> as From address</li>
                  </ol>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
