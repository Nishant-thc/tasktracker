import { prisma } from './prisma';
import nodemailer from 'nodemailer';
import { IncomingWebhook } from '@slack/webhook';

type TaskEvent = {
  taskId: string;
  projectId: string;
  accountId: string;
  action: 'start' | 'implement' | 'approve' | 'sendback' | 'reopen' | 'create';
  taskTitle: string;
  note?: string;
};

export async function notify(event: TaskEvent) {
  // 1. Fetch account integration config
  const account = await prisma.account.findUnique({
    where: { id: event.accountId },
    select: { communicationConfig: true, name: true }
  });

  const project = await prisma.project.findUnique({
    where: { id: event.projectId },
    select: { clientName: true, name: true, integrationsConfig: true }
  });

  if (!account || !project) return;

  const rawConfig = account.communicationConfig ? JSON.parse(account.communicationConfig) : {};
  const config = {
    whatsapp: rawConfig.whatsapp || { enabled: false },
    slack: rawConfig.slack || { enabled: false },
    email: rawConfig.email || { enabled: false },
  };

  const messageText = `Task update for ${project.clientName}: "${event.taskTitle}" is now ${event.action}. ${event.note ? `\nNote: ${event.note}` : ''}`;

  // We will dispatch to queue so that requests aren't blocking UI, or just send directly for MVP
  const promises = [];

  // Channel: Slack
  if (config.slack.enabled && config.slack.webhookUrl) {
    const slackConfig = config.slack;
    const webhook = new IncomingWebhook(slackConfig.webhookUrl);
    
    promises.push(
      webhook.send({ text: messageText }).then(() => {
        return logMessage(event, 'slack', 'Slack Channel', messageText);
      }).catch(err => console.error('Slack fail:', err))
    );
  }

  // Channel: Email
  if (config.email.enabled && config.email.smtpHost) {
    const eConf = config.email;
    const transporter = nodemailer.createTransport({
      host: eConf.smtpHost,
      port: parseInt(eConf.smtpPort) || 587,
      secure: parseInt(eConf.smtpPort) === 465,
      auth: { user: eConf.smtpUser, pass: eConf.smtpPass },
    });

    const mailOptions = {
      from: eConf.fromEmail || eConf.smtpUser,
      to: 'client@example.com', // In reality, we'd pull this from project's ClientContacts
      subject: `Update on Task: ${event.taskTitle}`,
      text: messageText,
    };

    promises.push(
      transporter.sendMail(mailOptions).then(() => {
        return logMessage(event, 'email', 'client@example.com', messageText);
      }).catch(err => console.error('Email fail:', err))
    );
  }

  // Channel: WhatsApp (Meta Cloud API)
  if (config.whatsapp.enabled && config.whatsapp.apiToken) {
    const wa = config.whatsapp;
    // We mock WhatsApp API request structure for Meta Cloud API
    const waUrl = `https://graph.facebook.com/v17.0/${wa.phoneNumberId}/messages`;
    promises.push(
      fetch(waUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wa.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '1234567890', // In reality, pull from ClientContact phone number
          type: 'text',
          text: { body: messageText }
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message);
        return logMessage(event, 'whatsapp', 'Client WA', messageText);
      })
      .catch(err => console.error('WA fail:', err))
    );
  }

  // Channel: In-App System Log (always)
  promises.push(logMessage(event, 'system', 'All', messageText));

  await Promise.all(promises);
}

async function logMessage(event: TaskEvent, channel: string, toName: string, body: string) {
  return prisma.messageLog.create({
    data: {
      projectId: event.projectId,
      accountId: event.accountId,
      channel,
      direction: 'outbound',
      fromName: 'System',
      toName,
      subject: `Task: ${event.taskTitle}`,
      body,
    }
  });
}
