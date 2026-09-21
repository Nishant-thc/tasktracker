/**
 * BACKEND API STUBS
 * 
 * This file contains placeholders for all external API integrations.
 * The backend team will replace these `console.log` statements with the actual API SDKs
 * (e.g., googleapis, twilio, @sendgrid/mail, @slack/web-api).
 */

export async function connectGoogleOAuth(projectId: string) {
  console.log(`[API STUB: Google OAuth] Initiating OAuth flow for project ${projectId}`);
  console.log(`[API STUB: Google OAuth] Backend should redirect to Google Auth URL and store refresh tokens.`);
  return { success: true };
}

export async function disconnectGoogleOAuth(projectId: string) {
  console.log(`[API STUB: Google OAuth] Revoking access for project ${projectId}`);
  return { success: true };
}

export async function sendWhatsAppMessage(to: string, message: string) {
  console.log(`[API STUB: WhatsApp] Sending message to ${to}`);
  console.log(`[API STUB: WhatsApp] Payload:`, message);
  return { success: true };
}

export async function sendEmailAlert(to: string, subject: string, body: string) {
  console.log(`[API STUB: Email] Sending email to ${to}`);
  console.log(`[API STUB: Email] Subject: ${subject}`);
  console.log(`[API STUB: Email] Body:`, body);
  return { success: true };
}

export async function sendSlackWebhook(channel: string, message: string) {
  console.log(`[API STUB: Slack] Posting to channel ${channel}`);
  console.log(`[API STUB: Slack] Payload:`, message);
  return { success: true };
}

export async function fetchGA4Sessions(propertyId: string, startDate: Date, endDate: Date) {
  console.log(`[API STUB: GA4] Fetching sessions for property ${propertyId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  return { sessions: 15200 }; // mock data
}

export async function fetchGSCData(siteUrl: string, startDate: Date, endDate: Date) {
  console.log(`[API STUB: GSC] Fetching clicks for site ${siteUrl} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  return { clicks: 8400 }; // mock data
}
