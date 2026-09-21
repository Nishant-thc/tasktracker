'use client';

import React, { useState } from 'react';
import { updateProjectSettings } from '@/app/actions/taskActions';

type Config = {
  ga4: { prop: string; on: boolean };
  gsc: { site: string; on: boolean };
  whatsapp: { on: boolean; to: string };
  email: { on: boolean; to: string };
  slack: { on: boolean; channel: string };
  clientDigest: { on: boolean; time: string };
  qcDigest: { on: boolean; time: string };
  monthly: { on: boolean; day: string };
  googleConnected?: boolean;
  importantLinks?: { id: string; url: string; anchor: string }[];
};

const defCfg = (): Config => ({
  ga4: { prop: '', on: false },
  gsc: { site: '', on: false },
  whatsapp: { on: false, to: '' },
  email: { on: true, to: '' },
  slack: { on: false, channel: '' },
  clientDigest: { on: true, time: '09:00' },
  qcDigest: { on: true, time: '09:30' },
  monthly: { on: true, day: '1' },
  importantLinks: [],
});

export default function SettingsView({ 
  projectId, 
  initialConfig, 
  initialColor,
  initialClientLogo,
  initialAgencyLogo
}: { 
  projectId: string, 
  initialConfig: string | null, 
  initialColor: string | null,
  initialClientLogo: string | null,
  initialAgencyLogo: string | null
}) {
  const [color, setColor] = useState(initialColor || '#2F5BEA');
  const [clientLogo, setClientLogo] = useState(initialClientLogo || '');
  const [agencyLogo, setAgencyLogo] = useState(initialAgencyLogo || '');
  const [cfg, setCfg] = useState<Config>(() => {
    const defaults = defCfg();
    try {
      if (initialConfig) {
        const parsed = JSON.parse(initialConfig);
        return {
          ...defaults,
          ...parsed,
          ga4: { ...defaults.ga4, ...(parsed.ga4 || {}) },
          gsc: { ...defaults.gsc, ...(parsed.gsc || {}) },
          whatsapp: { ...defaults.whatsapp, ...(parsed.whatsapp || {}) },
          email: { ...defaults.email, ...(parsed.email || {}) },
          slack: { ...defaults.slack, ...(parsed.slack || {}) },
          clientDigest: { ...defaults.clientDigest, ...(parsed.clientDigest || {}) },
          qcDigest: { ...defaults.qcDigest, ...(parsed.qcDigest || {}) },
          monthly: { ...defaults.monthly, ...(parsed.monthly || {}) },
          importantLinks: parsed.importantLinks ?? defaults.importantLinks,
        };
      }
    } catch (e) {}
    return defaults;
  });
  
  const [saving, setSaving] = useState(false);

  const update = (path: string, val: any) => {
    setCfg((prev) => {
      const parts = path.split('.');
      const next = { ...prev } as any;
      if (parts.length === 2) {
        next[parts[0]] = { ...(next[parts[0]] || {}), [parts[1]]: val };
      } else if (parts.length === 1) {
        next[parts[0]] = val;
      }
      return next;
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'client' | 'agency') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        
        if (type === 'client') {
          setClientLogo(dataUrl);
        } else {
          setAgencyLogo(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addImportantLink = () => {
    const newLinks = [...(cfg.importantLinks || []), { id: crypto.randomUUID(), url: '', anchor: '' }];
    update('importantLinks', newLinks);
  };

  const updateImportantLink = (id: string, field: 'url' | 'anchor', value: string) => {
    const newLinks = (cfg.importantLinks || []).map(link => link.id === id ? { ...link, [field]: value } : link);
    update('importantLinks', newLinks);
  };

  const removeImportantLink = (id: string) => {
    const newLinks = (cfg.importantLinks || []).filter(link => link.id !== id);
    update('importantLinks', newLinks);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectSettings(
        projectId, 
        JSON.stringify(cfg), 
        color, 
        clientLogo.trim() || null, 
        agencyLogo.trim() || null
      );
      alert('Settings saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <>
      <div className="panel">
        <div className="ph2">
          <div>
            <h2>Appearance</h2>
            <p>Customize the look and feel of the project for your client.</p>
          </div>
          <div>
            <button className="btn sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </div>
        <div className="f" style={{ maxWidth: '300px' }}>
          <label>Primary Brand Color</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="color" 
              value={color} 
              onChange={e => setColor(e.target.value)} 
              style={{ width: '40px', height: '40px', padding: '0', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer' }}
            />
            <input 
              type="text" 
              value={color} 
              onChange={e => setColor(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <div className="f" style={{ maxWidth: '300px' }}>
          <label>Agency Logo</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {agencyLogo && <img src={agencyLogo} alt="Agency" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--line)' }} />}
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'agency')} />
          </div>
          <div className="h">Changes for the entire account</div>
        </div>
        <div className="f" style={{ maxWidth: '300px' }}>
          <label>Client Logo</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {clientLogo && <img src={clientLogo} alt="Client" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--line)' }} />}
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'client')} />
          </div>
          <div className="h">Changes for this project only</div>
        </div>
      </div>

      <div className="panel">
        <div className="ph2">
          <div>
            <h2>Data sources</h2>
            <p>Connect your Google Account to securely access GA4 and GSC data.</p>
          </div>
        </div>
        
        <div style={{ padding: '0 0 16px 0' }}>
          {!cfg.googleConnected ? (
            <button 
              className="btn ghost" 
              onClick={() => {
                alert('Mock OAuth: Redirecting to Google...');
                update('googleConnected', true);
              }}
            >
              Sign in with Google
            </button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--s-done)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
              ✓ Connected to Google (Full Access)
              <button onClick={() => update('googleConnected', false)} style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', marginLeft: '8px' }}>Disconnect</button>
            </div>
          )}
        </div>

        <div className="fg" style={{ opacity: cfg.googleConnected ? 1 : 0.5, pointerEvents: cfg.googleConnected ? 'auto' : 'none' }}>
          <div>
            <div className="f">
              <label>Google Analytics 4 Property ID</label>
              <input type="text" value={cfg.ga4?.prop ?? ''} onChange={e => update('ga4.prop', e.target.value)} placeholder="e.g. 123456789" />
            </div>
            <label className="chk">
              <input type="checkbox" checked={cfg.ga4?.on ?? false} onChange={e => update('ga4.on', e.target.checked)} />
              Use GA4 sessions for impact model
            </label>
          </div>
          <div>
            <div className="f">
              <label>Search Console Site URL</label>
              <input type="text" value={cfg.gsc?.site ?? ''} onChange={e => update('gsc.site', e.target.value)} placeholder="e.g. https://example.com" />
            </div>
            <label className="chk">
              <input type="checkbox" checked={cfg.gsc?.on ?? false} onChange={e => update('gsc.on', e.target.checked)} />
              Use GSC clicks for impact model
            </label>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph2">
          <div>
            <h2>Important Links</h2>
            <p>Add quick links to key documents (e.g. SEO spreadsheet, LookerStudio) so your client can access them easily from any tab.</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(cfg.importantLinks || []).map(link => (
            <div key={link.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="text" 
                value={link.anchor} 
                onChange={e => updateImportantLink(link.id, 'anchor', e.target.value)} 
                placeholder="Link Text (e.g. SEO Sheet)" 
                style={{ flex: 1, maxWidth: '200px' }}
              />
              <input 
                type="url" 
                value={link.url} 
                onChange={e => updateImportantLink(link.id, 'url', e.target.value)} 
                placeholder="https://..." 
                style={{ flex: 2 }}
              />
              <button 
                className="btn ghost sm" 
                onClick={() => removeImportantLink(link.id)}
                style={{ color: 'var(--hi)' }}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="btn sm ghost" onClick={addImportantLink} style={{ alignSelf: 'flex-start' }}>
            + Add Link
          </button>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <h2>Notifications</h2>
          <p className="note" style={{ marginTop: '2px' }}>Where automated updates should be sent.</p>
          
          <div className="f" style={{ marginTop: '14px' }}>
            <label>WhatsApp group</label>
            <input type="text" value={cfg.whatsapp?.to ?? ''} onChange={e => update('whatsapp.to', e.target.value)} placeholder="Group ID or phone number" />
            <label className="chk" style={{ marginTop: '4px' }}>
              <input type="checkbox" checked={cfg.whatsapp?.on ?? false} onChange={e => update('whatsapp.on', e.target.checked)} />
              Send updates to WhatsApp
            </label>
          </div>

          <div className="f">
            <label>Client email</label>
            <input type="email" value={cfg.email?.to ?? ''} onChange={e => update('email.to', e.target.value)} placeholder="hello@client.com" />
            <label className="chk" style={{ marginTop: '4px' }}>
              <input type="checkbox" checked={cfg.email?.on ?? false} onChange={e => update('email.on', e.target.checked)} />
              Send updates via email
            </label>
          </div>

          <div className="f">
            <label>Agency Slack channel</label>
            <input type="text" value={cfg.slack?.channel ?? ''} onChange={e => update('slack.channel', e.target.value)} placeholder="#project-updates" />
            <label className="chk" style={{ marginTop: '4px' }}>
              <input type="checkbox" checked={cfg.slack?.on ?? false} onChange={e => update('slack.on', e.target.checked)} />
              Send QC alerts to Slack
            </label>
          </div>
        </div>

        <div className="panel">
          <h2>Schedules</h2>
          <p className="note" style={{ marginTop: '2px' }}>When automated updates should be sent.</p>

          <div className="f" style={{ marginTop: '14px' }}>
            <label>Daily client digest</label>
            <input type="time" value={cfg.clientDigest?.time ?? '09:00'} onChange={e => update('clientDigest.time', e.target.value)} />
            <label className="chk" style={{ marginTop: '4px' }}>
              <input type="checkbox" checked={cfg.clientDigest?.on ?? true} onChange={e => update('clientDigest.on', e.target.checked)} />
              Enabled
            </label>
          </div>

          <div className="f">
            <label>Daily agency QC alert</label>
            <input type="time" value={cfg.qcDigest?.time ?? '09:30'} onChange={e => update('qcDigest.time', e.target.value)} />
            <label className="chk" style={{ marginTop: '4px' }}>
              <input type="checkbox" checked={cfg.qcDigest?.on ?? true} onChange={e => update('qcDigest.on', e.target.checked)} />
              Enabled
            </label>
          </div>

          <div className="f">
            <label>Monthly report</label>
            <select value={cfg.monthly?.day ?? '1'} onChange={e => update('monthly.day', e.target.value)}>
              {[1,2,3,4,5,6,7].map(d => (
                <option key={d} value={d}>Day {d} of month</option>
              ))}
            </select>
            <label className="chk" style={{ marginTop: '4px' }}>
              <input type="checkbox" checked={cfg.monthly?.on ?? true} onChange={e => update('monthly.on', e.target.checked)} />
              Enabled
            </label>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </>
  );
}
