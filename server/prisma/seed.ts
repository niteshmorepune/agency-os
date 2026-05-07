import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Agency
  const agency = await prisma.agency.upsert({
    where: { id: 'agency_neds' },
    update: {},
    create: {
      id: 'agency_neds',
      name: 'Niranjan Enterprises Digital Solutions',
      primaryColor: '#1a472a',
      accentColor: '#c8522a',
      fontFamily: 'Inter',
      reportTagline: 'Digital Growth for Modern Businesses',
      aiMonthlyBudgetUsd: 50,
    },
  });

  // Users
  const users = [
    { id: 'user_owner', email: 'owner@nedsdrishti.in', name: 'Niranjan', role: 'OWNER' as const, password: 'Owner1234!' },
    { id: 'user_manager', email: 'manager@nedsdrishti.in', name: 'Account Manager', role: 'ACCOUNT_MANAGER' as const, password: 'Manager1234!' },
    { id: 'user_creator', email: 'creator@nedsdrishti.in', name: 'Content Creator', role: 'CONTENT_CREATOR' as const, password: 'Creator1234!' },
    { id: 'user_analyst', email: 'analyst@nedsdrishti.in', name: 'SEO Analyst', role: 'SEO_ANALYST' as const, password: 'Analyst1234!' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role, passwordHash: await bcrypt.hash(u.password, 12), agencyId: agency.id },
    });
  }

  // Client 1: TechStart India
  const techstart = await prisma.client.upsert({
    where: { id: 'client_techstart' },
    update: {},
    create: {
      id: 'client_techstart',
      agencyId: agency.id,
      name: 'TechStart India',
      domain: 'techstartindia.com',
      brandName: 'TechStart',
      industry: 'SaaS / B2B Technology',
      targetAudience: 'Startup founders and CTOs in India, aged 28-45',
      competitors: ['competitor1.com', 'competitor2.io', 'competitor3.in'],
      monthlyRetainer: 75000,
      contactName: 'Rahul Sharma',
      contactEmail: 'rahul@techstartindia.com',
      status: 'ACTIVE',
    },
  });

  // Client 2: Mumbai Bites
  const mumbaibites = await prisma.client.upsert({
    where: { id: 'client_mumbaibites' },
    update: {},
    create: {
      id: 'client_mumbaibites',
      agencyId: agency.id,
      name: 'Mumbai Bites',
      domain: 'mumbaibites.com',
      brandName: 'Mumbai Bites',
      industry: 'Food & Beverage / Restaurant Chain',
      targetAudience: 'Food lovers in Mumbai, aged 22-40, urban professionals',
      competitors: ['competitor-restaurant1.com', 'competitor-restaurant2.in'],
      monthlyRetainer: 45000,
      contactName: 'Priya Patel',
      contactEmail: 'priya@mumbaibites.com',
      status: 'ACTIVE',
    },
  });

  // Assign team to clients
  for (const clientId of [techstart.id, mumbaibites.id]) {
    for (const userId of ['user_manager', 'user_creator', 'user_analyst']) {
      await prisma.clientAssignment.upsert({
        where: { clientId_userId: { clientId, userId } },
        update: {},
        create: { clientId, userId },
      });
    }
  }

  // Platform optimizations for TechStart
  for (const platform of ['LINKEDIN', 'INSTAGRAM', 'GBP', 'EMAIL'] as const) {
    await prisma.platformOptimization.upsert({
      where: { clientId_platform: { clientId: techstart.id, platform } },
      update: {},
      create: { clientId: techstart.id, platform, score: Math.floor(Math.random() * 30) + 40 },
    });
  }

  // Platform optimizations for Mumbai Bites
  for (const platform of ['GBP', 'INSTAGRAM', 'WHATSAPP', 'FACEBOOK'] as const) {
    await prisma.platformOptimization.upsert({
      where: { clientId_platform: { clientId: mumbaibites.id, platform } },
      update: {},
      create: { clientId: mumbaibites.id, platform, score: Math.floor(Math.random() * 30) + 35 },
    });
  }

  // Content ideas for TechStart
  const techIdeas = [
    { title: '5 SaaS metrics every founder should track in 2026', format: 'carousel', hook: 'Most founders track the wrong metrics. Here\'s what actually matters:', platform: 'LINKEDIN' as const },
    { title: 'How we 10x\'d our trial-to-paid conversion', format: 'post', hook: 'We went from 2% to 22% trial-to-paid in 90 days. Here\'s exactly what we changed:', platform: 'LINKEDIN' as const },
    { title: 'Behind the scenes: our product launch day', format: 'reel', hook: 'It\'s launch day. 6am. Here\'s what the next 18 hours look like:', platform: 'INSTAGRAM' as const },
    { title: 'Customer success story: How [Client] saved 20hrs/week', format: 'post', hook: 'Before TechStart: 20 hours/week on manual reporting. After: 2 hours.', platform: 'LINKEDIN' as const },
    { title: 'Myth: You need VC funding to build a SaaS', format: 'thread', hook: 'You don\'t need VC money to build a successful SaaS. Here\'s the truth:', platform: 'TWITTER' as const },
  ];

  for (const idea of techIdeas) {
    await prisma.contentIdea.create({ data: { clientId: techstart.id, ...idea, outline: `1. Hook\n2. Main insight\n3. Actionable tips\n4. CTA`, status: 'SAVED' } });
  }

  // Scheduled posts for TechStart
  await prisma.postDraft.createMany({
    data: [
      { clientId: techstart.id, createdById: 'user_creator', platforms: ['LINKEDIN'], caption: 'Excited to share our Q1 results! We helped 23 startups scale their digital presence this quarter. The secret? A systematic approach to content + data-driven optimization. What\'s your biggest content challenge right now? 👇', hashtags: ['#SaaS', '#StartupIndia', '#DigitalMarketing', '#TechStart'], mediaUrls: [], altTexts: [], status: 'SCHEDULED', approvalStatus: 'APPROVED', approvedById: 'user_manager', scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), aiGenerated: false, notes: '' },
      { clientId: techstart.id, createdById: 'user_creator', platforms: ['INSTAGRAM', 'FACEBOOK'], caption: 'The best time to optimize your digital presence was yesterday. The second best time is now. 🚀\n\nWe\'re helping Indian startups build their digital presence the right way. Drop a 🙋 if you want to know how!', hashtags: ['#TechStart', '#StartupIndia', '#DigitalGrowth'], mediaUrls: [], altTexts: [], status: 'DRAFT', approvalStatus: 'PENDING', aiGenerated: true, notes: '' },
    ],
    skipDuplicates: true,
  });

  // Personas for TechStart
  await prisma.audiencePersona.create({
    data: {
      clientId: techstart.id,
      name: 'Startup Sam',
      demographics: { ageRange: '28-38', gender: 'Male-skewed (65%)', location: 'Bengaluru, Mumbai, Delhi NCR', income: '₹15L-50L/year', education: 'Engineering or MBA', jobTitle: 'Founder/Co-founder or CTO' },
      psychographics: { values: ['Growth', 'Efficiency', 'Innovation', 'Independence'], interests: ['Tech trends', 'Startup ecosystems', 'Product management', 'Leadership'], lifestyle: 'Work-first, learning-obsessed, podcast listener during commute', personality: 'Analytical, ambitious, data-driven, early adopter' },
      digitalBehavior: { primaryPlatforms: ['LinkedIn', 'Twitter', 'YouTube'], contentFormats: ['Long-form articles', 'Video tutorials', 'Threads', 'Podcasts'], bestPostingTimes: ['Tue 8-9am IST', 'Wed 12-1pm IST', 'Thu 6-7pm IST'], deviceUsage: 'Mobile-first (70% mobile)', purchaseBehavior: 'Research-heavy, peer recommendations crucial, trial before buy' },
      painPoints: ['Burning through runway on wrong marketing channels', 'Can\'t afford full-time marketing team', 'Inconsistent content strategy', 'No clear attribution for marketing spend', 'Losing to competitors with bigger budgets'],
      goals: ['Reach Series A readiness', 'Build inbound lead pipeline', 'Establish thought leadership', 'Reduce CAC by 30%', 'Build a brand people recognize in the niche'],
      objections: ['Too expensive for early-stage startup', 'We can do marketing ourselves', 'Not sure if we\'re ready for an agency'],
      contentTriggers: ['Case studies with real numbers', 'Free audits or assessments', 'Peer success stories', 'Tactical how-to content', 'Industry benchmarks'],
      messagingGuide: { tone: 'Direct, data-driven, peer-to-peer (not corporate)', keywords: ['scale', 'growth', 'ROI', 'startup', 'systematic', 'results'], wordsToAvoid: ['synergy', 'leverage', 'paradigm shift', 'holistic approach'], exampleCTA: 'Get your free digital audit →' },
    },
  });

  // Monthly report placeholder for TechStart
  await prisma.generatedReport.create({
    data: {
      clientId: techstart.id,
      type: 'MONTHLY',
      period: '2026-04',
      pdfUrl: '/reports/techstart-april-2026.pdf',
      data: { overallScore: 58, platforms: { LINKEDIN: 62, INSTAGRAM: 47, GBP: 71, EMAIL: 54 }, period: '2026-04' },
    },
  });

  // Audit for Mumbai Bites
  const auditProject = await prisma.auditProject.create({
    data: {
      clientId: mumbaibites.id,
      name: 'Mumbai Bites Digital Audit — May 2026',
      status: 'IN_PROGRESS',
      competitorDomains: ['competitor-restaurant1.com', 'competitor-restaurant2.in'],
    },
  });

  await prisma.auditCheck.createMany({
    data: [
      { auditId: auditProject.id, moduleId: 'website_seo', checkId: 'ssl_check', status: 'PASS', score: 100, weight: 3 },
      { auditId: auditProject.id, moduleId: 'website_seo', checkId: 'pagespeed_mobile', status: 'WARN', score: 55, weight: 4 },
      { auditId: auditProject.id, moduleId: 'gbp', checkId: 'gbp_claimed', status: 'PASS', score: 100, weight: 5 },
      { auditId: auditProject.id, moduleId: 'gbp', checkId: 'gbp_reviews', status: 'WARN', score: 60, weight: 5 },
      { auditId: auditProject.id, moduleId: 'social_media', checkId: 'ig_bio', status: 'FAIL', score: 20, weight: 4 },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed data created successfully');
  console.log('   Agency: Niranjan Enterprises Digital Solutions');
  console.log('   Logins:');
  console.log('   owner@nedsdrishti.in / Owner1234!');
  console.log('   manager@nedsdrishti.in / Manager1234!');
  console.log('   creator@nedsdrishti.in / Creator1234!');
  console.log('   analyst@nedsdrishti.in / Analyst1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
