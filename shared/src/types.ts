import { Role, Platform, CheckStatus, ClientStatus, PostStatus, ApprovalStatus, IdeaStatus, ReportType } from './enums';

export interface JwtPayload {
  userId: string;
  agencyId: string;
  role: Role;
  email: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// Agency
export interface AgencyBranding {
  name: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  reportFooter?: string;
  reportTagline?: string;
  faviconUrl?: string;
  customDomain?: string;
}

// User
export interface UserProfile {
  id: string;
  agencyId: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  lastLoginAt?: string;
  isActive: boolean;
  createdAt: string;
}

// Client
export interface ClientSummary {
  id: string;
  agencyId: string;
  name: string;
  domain: string;
  brandName?: string;
  industry?: string;
  targetAudience?: string;
  competitors: string[];
  monthlyRetainer?: number;
  contactName?: string;
  contactEmail?: string;
  status: ClientStatus;
  createdAt: string;
}

export interface ClientDashboard {
  client: ClientSummary;
  overallScore: number;
  platformScores: { platform: Platform; score: number }[];
  contentSummary: {
    scheduled: number;
    published: number;
    ideas: number;
  };
  actionItemsCount: number;
  teamActivity: ActivityEntry[];
  aiUsageThisMonth: number;
}

// Platform Optimization
export interface PlatformOptimizationSummary {
  platform: Platform;
  score: number;
  checksTotal: number;
  checksPassed: number;
  checksWarning: number;
  checksFailed: number;
  checksPending: number;
  updatedAt: string;
}

export interface PlatformCheckData {
  id: string;
  checkId: string;
  status: CheckStatus;
  score?: number;
  notes?: string;
  aiSuggestion?: string;
  manualInput?: string;
  updatedAt: string;
}

// Posts
export interface PostDraftData {
  id: string;
  clientId: string;
  platforms: Platform[];
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  platformOverrides?: Record<string, { caption: string; hashtags: string[] }>;
  scheduledAt?: string;
  status: PostStatus;
  approvalStatus: ApprovalStatus;
  approvedById?: string;
  aiGenerated: boolean;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Content Ideas
export interface ContentIdeaData {
  id: string;
  clientId: string;
  platform: Platform;
  title: string;
  format: string;
  hook: string;
  outline: string;
  status: IdeaStatus;
  usedInPost?: string;
  createdAt: string;
}

// AI Studio
export interface AIToolInput {
  toolId: string;
  clientId?: string;
  inputs: Record<string, string>;
}

export interface AIToolOutput {
  toolId: string;
  result: unknown;
  cached: boolean;
  tokensUsed?: number;
  costUsd?: number;
}

// Personas
export interface AudiencePersonaData {
  id: string;
  clientId: string;
  name: string;
  demographics: {
    ageRange: string;
    gender: string;
    location: string;
    income: string;
    education: string;
    jobTitle: string;
  };
  psychographics: {
    values: string[];
    interests: string[];
    lifestyle: string;
    personality: string;
  };
  digitalBehavior: {
    primaryPlatforms: string[];
    contentFormats: string[];
    bestPostingTimes: string[];
    deviceUsage: string;
    purchaseBehavior: string;
  };
  painPoints: string[];
  goals: string[];
  objections: string[];
  contentTriggers: string[];
  messagingGuide: {
    tone: string;
    keywords: string[];
    wordsToAvoid: string[];
    exampleCTA: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Competitor
export interface CompetitorProfileData {
  id: string;
  clientId: string;
  name: string;
  website?: string;
  platforms: Record<string, {
    handle: string;
    followers: number;
    postsPerWeek: number;
    avgEngagement: number;
    contentThemes: string[];
    strengths: string[];
    weaknesses: string[];
  }>;
  automatedData?: {
    websiteScore: number;
    pageSpeed: number;
    ssl: boolean;
    domainAuthority: number;
  };
  updatedAt: string;
  createdAt: string;
}

// Reports
export interface GeneratedReportData {
  id: string;
  clientId: string;
  type: ReportType;
  period: string;
  pdfUrl: string;
  data: Record<string, unknown>;
  createdAt: string;
}

// Activity
export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Audit
export interface AuditNote {
  id: string;
  content: string;
  isInternal: boolean;
  authorId: string;
  authorName: string;
  mentions: string[];
  createdAt: string;
}

export interface AuditCheckResult {
  id: string;
  checkId: string;
  status: 'pending' | 'pass' | 'warn' | 'fail' | 'na';
  score: number;
  data?: Record<string, unknown>;
  aiSuggestion?: string;
  notes: AuditNote[];
  lastCheckedAt?: string;
}
