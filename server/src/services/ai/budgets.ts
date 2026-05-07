export const TOKEN_BUDGETS: Record<string, number> = {
  caption: 400,
  hashtag: 300,
  bio: 500,
  subject_line: 200,
  ad_headlines: 600,
  thread: 1200,
  email_body: 1000,
  review_reply: 300,
  repurpose: 1500,
  persona: 1800,
  competitor: 1200,
  audit_suggest: 400,
  rewrite: 600,
  ad: 600,
  keyword: 500,
  hook: 400,
  script: 1200,
  post_ideas: 800,
};

export const CACHE_TTL: Record<string, number> = {
  caption: 86400,
  hashtag: 86400,
  bio: 86400,
  subject_line: 86400,
  ad_headlines: 86400,
  thread: 86400,
  email_body: 86400,
  review_reply: 86400,
  repurpose: 259200,    // 3 days
  persona: 604800,      // 7 days
  competitor: 259200,   // 3 days
  audit_suggest: 86400,
  rewrite: 86400,
  ad: 86400,
  keyword: 86400,
  hook: 86400,
  script: 86400,
  post_ideas: 86400,
};

export const COST_PER_INPUT_TOKEN = 0.000003;   // claude-sonnet-4 pricing
export const COST_PER_OUTPUT_TOKEN = 0.000015;
