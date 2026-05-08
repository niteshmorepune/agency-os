import { prisma } from './prisma';
import { NotificationType } from '@prisma/client';

export async function createNotification(params: {
  agencyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({ data: params });
  } catch {
    // Notifications are best-effort — never fail the parent request
  }
}
