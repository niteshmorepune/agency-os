import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/:token', asyncHandler(async (req, res) => {
  const record = await prisma.onboardingToken.findUnique({
    where: { token: req.params.token },
    include: {
      client: {
        include: { agency: { select: { name: true, logoUrl: true, primaryColor: true, accentColor: true } } },
      },
    },
  });

  if (!record) { res.status(404).json({ error: 'Invalid onboarding link' }); return; }
  if (record.expiresAt < new Date()) { res.status(410).json({ error: 'This onboarding link has expired. Contact your account manager for a new link.' }); return; }
  if (record.usedAt) { res.status(409).json({ error: 'This onboarding questionnaire has already been submitted.' }); return; }

  res.json({
    data: {
      clientName: record.client.name,
      agency: record.client.agency,
      expiresAt: record.expiresAt,
    },
  });
}));

const onboardingSchema = z.object({
  businessName: z.string().min(1).max(200),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().min(1).max(100),
  businessDescription: z.string().max(2000).optional(),
  targetAudience: z.string().max(500).optional(),
  primaryLocation: z.string().max(100).optional(),
  instagramHandle: z.string().max(100).optional(),
  facebookHandle: z.string().max(100).optional(),
  linkedinHandle: z.string().max(100).optional(),
  youtubeHandle: z.string().max(100).optional(),
  twitterHandle: z.string().max(100).optional(),
  tiktokHandle: z.string().max(100).optional(),
  pinterestHandle: z.string().max(100).optional(),
  whatsappNumber: z.string().max(20).optional(),
  googleBusinessName: z.string().max(200).optional(),
  topGoals: z.array(z.string()).optional(),
  currentChallenges: z.string().max(1000).optional(),
  competitors: z.string().max(500).optional(),
  monthlyBudget: z.string().max(50).optional(),
  hasExistingContent: z.boolean().optional(),
  contentApprovalContact: z.string().max(100).optional(),
  brandColors: z.string().max(200).optional(),
  brandTone: z.string().max(50).optional(),
  wordsToAvoid: z.string().max(500).optional(),
});

router.post('/:token', asyncHandler(async (req, res) => {
  const record = await prisma.onboardingToken.findUnique({
    where: { token: req.params.token },
    include: { client: { select: { id: true, agencyId: true, name: true, assignments: { include: { user: { select: { id: true } } } } } } },
  });

  if (!record) { res.status(404).json({ error: 'Invalid onboarding link' }); return; }
  if (record.expiresAt < new Date()) { res.status(410).json({ error: 'This link has expired' }); return; }
  if (record.usedAt) { res.status(409).json({ error: 'Already submitted' }); return; }

  const data = onboardingSchema.parse(req.body);
  const client = record.client;

  const competitors = data.competitors ? data.competitors.split(',').map(s => s.trim()).filter(Boolean) : [];

  await prisma.$transaction([
    prisma.client.update({
      where: { id: client.id },
      data: {
        name: data.businessName ?? client.name,
        domain: data.website || undefined,
        industry: data.industry,
        targetAudience: data.targetAudience,
        primaryLocation: data.primaryLocation,
        brandTone: data.brandTone,
        wordsToAvoid: data.wordsToAvoid,
        competitors: competitors.length > 0 ? competitors : undefined,
        onboardingData: data as never,
        onboardingComplete: true,
        onboardingCompletedAt: new Date(),
      },
    }),
    prisma.onboardingToken.update({
      where: { token: req.params.token },
      data: { usedAt: new Date() },
    }),
    ...(client.assignments[0]?.user?.id ? [prisma.activityLog.create({
      data: {
        agencyId: client.agencyId,
        userId: client.assignments[0].user!.id,
        action: 'ONBOARDING_COMPLETED',
        resourceType: 'client',
        resourceId: client.id,
        metadata: { clientName: data.businessName },
      },
    })] : []),
  ]);

  if (data.targetAudience) {
    await prisma.audiencePersona.create({
      data: {
        clientId: client.id,
        name: 'Primary Audience (Draft)',
        demographics: { ageRange: 'TBD', location: data.primaryLocation ?? 'India' },
        psychographics: { values: [], interests: [] },
        digitalBehavior: { primaryPlatforms: [], contentFormats: [] },
        painPoints: [],
        goals: data.topGoals ?? [],
        objections: [],
        contentTriggers: [],
        messagingGuide: {
          tone: data.brandTone ?? 'professional',
          keywords: [],
          wordsToAvoid: data.wordsToAvoid ? [data.wordsToAvoid] : [],
          exampleCTA: '',
          description: data.targetAudience,
        },
      },
    }).catch(() => null);
  }

  res.json({ data: { success: true } });
}));

export default router;
