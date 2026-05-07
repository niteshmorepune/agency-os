export enum Role {
  OWNER = 'OWNER',
  ACCOUNT_MANAGER = 'ACCOUNT_MANAGER',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
  SEO_ANALYST = 'SEO_ANALYST',
  CLIENT = 'CLIENT',
  AUDITOR = 'AUDITOR',
}

export enum Platform {
  LINKEDIN = 'LINKEDIN',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  GBP = 'GBP',
  YOUTUBE = 'YOUTUBE',
  TWITTER = 'TWITTER',
  TIKTOK = 'TIKTOK',
  PINTEREST = 'PINTEREST',
  GOOGLE_ADS = 'GOOGLE_ADS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export enum CheckStatus {
  PENDING = 'PENDING',
  PASS = 'PASS',
  WARN = 'WARN',
  FAIL = 'FAIL',
  NA = 'NA',
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CHURNED = 'CHURNED',
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum IdeaStatus {
  SAVED = 'SAVED',
  USED = 'USED',
  REJECTED = 'REJECTED',
}

export enum ReportType {
  MONTHLY = 'MONTHLY',
  PLATFORM_SPECIFIC = 'PLATFORM_SPECIFIC',
  AUDIT_ONLY = 'AUDIT_ONLY',
  CUSTOM = 'CUSTOM',
}

export enum AuditCheckStatus {
  PENDING = 'pending',
  PASS = 'pass',
  WARN = 'warn',
  FAIL = 'fail',
  NA = 'na',
}
