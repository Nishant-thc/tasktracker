'use server';

import { prisma } from '../lib/prisma';
import { connectGoogleOAuth, disconnectGoogleOAuth } from '../lib/api-stubs';
import { revalidatePath } from 'next/cache';

async function writeMessageLog(projectId: string, accountId: string, body: string, fromName = 'System') {
  try {
    await prisma.messageLog.create({
      data: {
        projectId,
        accountId,
        channel: 'system',
        direction: 'system',
        fromName,
        toName: 'All',
        body,
      },
    });
  } catch (e) {
    console.error('Failed to write message log:', e);
  }
}

export async function executeTaskAction(taskId: string, action: string, note?: string, projectToken?: string) {
  const task = await prisma.dependency.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, accountId: true, clientName: true, projectToken: true } } }
  });
  if (!task) throw new Error('Task not found');

  if (projectToken) {
    if (task.project.projectToken !== projectToken) {
      throw new Error('Unauthorized: Invalid project token.');
    }
    if (action !== 'start' && action !== 'implement') {
      throw new Error('Unauthorized: Action not allowed for client.');
    }
  } else {
    const { getSession } = await import('../lib/session');
    const session = await getSession();
    if (!session || session.accountId !== task.project.accountId) {
      throw new Error('Unauthorized: Invalid session.');
    }
  }

  const now = new Date();
  const shortId = taskId.slice(0, 5).toUpperCase();

  const { notify } = await import('../lib/notify');
  const fire = (act: 'start' | 'implement' | 'approve' | 'sendback' | 'reopen', noteText?: string) => {
    return notify({
      taskId, projectId: task.project.id, accountId: task.project.accountId,
      action: act, taskTitle: task.title, note: noteText
    });
  };

  switch (action) {
    case 'start':
      if (task.status !== 'pending') throw new Error('Invalid state transition');
      await prisma.dependency.update({ where: { id: taskId }, data: { status: 'in_progress', startedAt: now } });
      await fire('start');
      break;
    case 'implement':
      if (task.status !== 'in_progress') throw new Error('Invalid state transition');
      await prisma.dependency.update({ where: { id: taskId }, data: { status: 'qc', qcAt: now } });
      await fire('implement');
      break;
    case 'approve':
      if (task.status !== 'qc') throw new Error('Invalid state transition');
      await prisma.dependency.update({ where: { id: taskId }, data: { status: 'closed', closedAt: now } });
      await fire('approve');
      break;
    case 'sendback':
      if (task.status !== 'qc') throw new Error('Invalid state transition');
      if (!note) throw new Error('Send back note is required');
      await prisma.dependency.update({
        where: { id: taskId },
        data: { status: 'in_progress', reworkCount: { increment: 1 }, sentBackNote: note, qcAt: null },
      });
      await fire('sendback', note);
      break;
    case 'reopen':
      if (task.status !== 'closed') throw new Error('Invalid state transition');
      await prisma.dependency.update({
        where: { id: taskId },
        data: { status: 'in_progress', closedAt: null, qcAt: null, reworkCount: { increment: 1 }, sentBackNote: 'Reopened by agency' },
      });
      await fire('reopen');
      break;
    case 'remove':
      await prisma.dependency.delete({ where: { id: taskId } });
      // No notification for silent deletion
      break;
    default:
      throw new Error('Unknown action');
  }

  revalidatePath('/', 'layout');
}

export async function createDependency(data: {
  projectId: string;
  title: string;
  category?: string | null;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  description: string;
  impactIfDelayed: string;
  links: string[];
  dueDate?: string | null;
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId }, select: { accountId: true } });
  const dep = await prisma.dependency.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      category: data.category || null,
      priority: data.priority,
      impactScore: data.impactScore,
      estimatedUpliftPct: data.estimatedUpliftPct,
      description: data.description || null,
      impactIfDelayed: data.impactIfDelayed || null,
      links: JSON.stringify(data.links),
      status: 'pending',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  if (project) {
    const { notify } = await import('../lib/notify');
    await notify({
      taskId: dep.id,
      projectId: data.projectId,
      accountId: project.accountId,
      action: 'create',
      taskTitle: data.title,
    });
  }

  revalidatePath('/', 'layout');
  return dep;
}

export async function updateDependency(data: {
  taskId: string;
  title: string;
  category?: string | null;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  description: string;
  impactIfDelayed: string;
  links: string[];
  dueDate?: string | null;
}) {
  const task = await prisma.dependency.findUnique({
    where: { id: data.taskId },
    select: { id: true, projectId: true, project: { select: { accountId: true } } }
  });
  if (!task) throw new Error('Task not found');

  const updated = await prisma.dependency.update({
    where: { id: data.taskId },
    data: {
      title: data.title,
      category: data.category || null,
      priority: data.priority,
      impactScore: data.impactScore,
      estimatedUpliftPct: data.estimatedUpliftPct,
      description: data.description || null,
      impactIfDelayed: data.impactIfDelayed || null,
      links: JSON.stringify(data.links),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  await writeMessageLog(task.projectId, task.project.accountId, `Task "${data.title}" was updated.`);
  revalidatePath('/', 'layout');
  return updated;
}

export async function createClientContact(data: {
  projectId: string;
  name: string;
  email: string;
  role: string;
}) {
  await prisma.clientContact.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      email: data.email,
      role: data.role,
    },
  });
  revalidatePath('/', 'layout');
}

export async function updateProjectSettings(
  projectId: string,
  configJson: string,
  primaryColor: string | null,
  clientLogoUrl: string | null,
  agencyLogoUrl: string | null
) {
  const previous = await prisma.project.findUnique({
    where: { id: projectId },
    select: { integrationsConfig: true, accountId: true }
  });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      integrationsConfig: configJson,
      primaryColor: primaryColor,
      clientLogoUrl: clientLogoUrl
    },
  });

  if (agencyLogoUrl !== undefined && previous) {
    await prisma.account.update({
      where: { id: previous.accountId },
      data: { agencyLogoUrl }
    });
  }

  try {
    const prevCfg = previous?.integrationsConfig ? JSON.parse(previous.integrationsConfig) : null;
    const nextCfg = JSON.parse(configJson);
    if (!prevCfg?.googleConnected && nextCfg.googleConnected) {
      await connectGoogleOAuth(projectId);
    } else if (prevCfg?.googleConnected && !nextCfg.googleConnected) {
      await disconnectGoogleOAuth(projectId);
    }
  } catch (e) {
    console.error('Failed to parse config json for api stubs', e);
  }

  revalidatePath('/', 'layout');
  return updated;
}

export async function updateCustomMetrics(projectId: string, customMetricsJson: string) {
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { customMetrics: customMetricsJson }
  });
  revalidatePath('/', 'layout');
  return updated;
}

export async function sendInsightNotification(projectId: string, metricTitle: string, message: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { accountId: true } });
  
  try {
    const { sendEmailAlert, sendSlackWebhook } = await import('../lib/api-stubs');
    await sendEmailAlert('client@example.com', `Insight: ${metricTitle}`, message);
    await sendSlackWebhook('#client-updates', `Insight on *${metricTitle}*:\n${message}`);
  } catch (e) {
    console.error('Failed to send insight', e);
  }

  if (project) {
    await prisma.messageLog.create({
      data: {
        projectId,
        accountId: project.accountId,
        channel: 'email',
        direction: 'outbound',
        fromName: 'Agency',
        toName: 'Client',
        subject: `Insight: ${metricTitle}`,
        body: message,
      }
    });
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function createProject(data: {
  accountId: string;
  clientName: string;
  name: string;
  type: string;
  category?: string;
  status?: string;
  accountManagerId?: string | null;
}) {
  try {
    if (!data.clientName || !data.name) {
      throw new Error('Client name and project name are required.');
    }

    if (!data.accountId) {
      throw new Error('Account ID is required.');
    }
    const targetAccountId = data.accountId;
    const acc = await prisma.account.findUnique({ where: { id: targetAccountId } });
    if (!acc) throw new Error('Invalid account ID. Account not found.');

    // Validate accountManagerId against User table to prevent Foreign Key errors
    let validAmId: string | null = null;
    if (data.accountManagerId) {
      const amUser = await prisma.user.findUnique({ where: { id: data.accountManagerId } });
      if (amUser) {
        validAmId = amUser.id;
      }
    }

    const token = crypto.randomUUID();

    // Safely auto-generate next unique project number
    const maxProject = await prisma.project.findFirst({
      orderBy: { projectNumber: 'desc' },
      select: { projectNumber: true },
    });

    const nextNumber = maxProject ? maxProject.projectNumber + 1 : 1000;

    const project = await prisma.project.create({
      data: {
        accountId: targetAccountId,
        clientName: data.clientName.trim(),
        name: data.name.trim(),
        type: data.type || 'Retainer',
        category: data.category || 'SEO',
        status: data.status || 'active',
        accountManagerId: validAmId,
        projectToken: token,
        projectNumber: nextNumber,
        integrationsConfig: JSON.stringify({ importantLinks: [] }),
      },
    });

    await writeMessageLog(project.id, targetAccountId, `Project "${data.name}" for ${data.clientName} created.`);

    try {
      revalidatePath('/', 'layout');
    } catch (e) {
      // ignore non-fatal revalidate error
    }

    return project;
  } catch (err: any) {
    console.error('Error inside createProject server action:', err);
    throw new Error(err?.message || 'Could not create project due to a database error.');
  }
}

export async function updateProjectCategory(projectId: string, category: string, status: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { category, status }
  });
  revalidatePath('/', 'layout');
}
