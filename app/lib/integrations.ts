/**
 * REAL API INTEGRATIONS
 * Free tier setup:
 *   Email  → Gmail SMTP + App Password (free, no limits for personal use)
 *   Slack  → Incoming Webhook from free Slack workspace
 *   Google → Google Cloud Console free tier (GA4 Data API + Search Console API)
 *   WhatsApp → Not wired (requires Meta business verification)
 */

import nodemailer from 'nodemailer';
import { IncomingWebhook } from '@slack/webhook';

// ─── Email (Gmail SMTP) ──────────────────────────────────────────────────────
function getEmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export async function sendEmailAlert(to: string, subject: string, body: string) {
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.log('[Email] Not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
    return { success: false, reason: 'not_configured' };
  }
  try {
    await transporter.sendMail({
      from: `"Task Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: body,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1B2230">${subject}</h2>
        <p style="color:#4B5568;line-height:1.6">${body.replace(/\n/g, '<br>')}</p>
        <hr style="border:none;border-top:1px solid #E2E6EE;margin:24px 0"/>
        <p style="color:#667089;font-size:12px">Sent by Task Tracker</p>
      </div>`,
    });
    return { success: true };
  } catch (e: any) {
    console.error('[Email] Send failed:', e.message);
    return { success: false, reason: e.message };
  }
}

// ─── Slack (Incoming Webhook) ────────────────────────────────────────────────
export async function sendSlackWebhook(channel: string, message: string, webhookUrl?: string) {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.log('[Slack] Not configured — set SLACK_WEBHOOK_URL in .env.local');
    return { success: false, reason: 'not_configured' };
  }
  try {
    const webhook = new IncomingWebhook(url);
    await webhook.send({ text: message });
    return { success: true };
  } catch (e: any) {
    console.error('[Slack] Send failed:', e.message);
    return { success: false, reason: e.message };
  }
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log('[WhatsApp] Not configured — set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env.local');
    return { success: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return { success: true };
  } catch (e: any) {
    console.error('[WhatsApp] Send failed:', e.message);
    return { success: false, reason: e.message };
  }
}

// ─── Google OAuth helpers ────────────────────────────────────────────────────
export async function connectGoogleOAuth(projectId: string) {
  // This is triggered from settings — actual OAuth is handled via /api/auth/google route
  console.log(`[Google OAuth] Connect initiated for project ${projectId} — handled by /api/auth/google`);
  return { success: true };
}

export async function disconnectGoogleOAuth(projectId: string) {
  const { prisma } = await import('./prisma');
  await prisma.project.update({
    where: { id: projectId },
    data: { googleRefreshToken: null },
  });
  return { success: true };
}

// ─── Google Analytics 4 ──────────────────────────────────────────────────────
export async function fetchGA4Sessions(propertyId: string, startDate: Date, endDate: Date, refreshToken?: string | null) {
  if (!refreshToken) {
    console.log('[GA4] No refresh token — connect Google account in Settings');
    return { sessions: null, pageviews: null, notConfigured: true };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.log('[GA4] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set');
    return { sessions: null, pageviews: null, notConfigured: true };
  }
  try {
    const { google } = await import('googleapis');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: oauth2 });
    const res = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
      },
    });
    const rows = res.data.rows || [];
    const sessions = parseInt(rows[0]?.metricValues?.[0]?.value || '0');
    const pageviews = parseInt(rows[0]?.metricValues?.[1]?.value || '0');
    return { sessions, pageviews, notConfigured: false };
  } catch (e: any) {
    console.error('[GA4] Fetch failed:', e.message);
    return { sessions: null, pageviews: null, notConfigured: false, error: e.message };
  }
}

// ─── Google Search Console ───────────────────────────────────────────────────
export async function fetchGSCData(siteUrl: string, startDate: Date, endDate: Date, refreshToken?: string | null) {
  if (!refreshToken) {
    console.log('[GSC] No refresh token — connect Google account in Settings');
    return { clicks: null, impressions: null, notConfigured: true };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { clicks: null, impressions: null, notConfigured: true };
  }
  try {
    const { google } = await import('googleapis');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const webmasters = google.webmasters({ version: 'v3', auth: oauth2 });
    const res = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: [],
      },
    });
    const row = res.data.rows?.[0];
    return {
      clicks: Math.round(row?.clicks || 0),
      impressions: Math.round(row?.impressions || 0),
      ctr: ((row?.ctr || 0) * 100).toFixed(1),
      position: (row?.position || 0).toFixed(1),
      notConfigured: false,
    };
  } catch (e: any) {
    console.error('[GSC] Fetch failed:', e.message);
    return { clicks: null, impressions: null, notConfigured: false, error: e.message };
  }
}