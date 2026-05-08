import { runAITool } from './client';
import type { JwtPayload } from '@agencyos/shared';

interface RewriteParams {
  platform: string;
  checkId: string;
  currentValue: string;
  brandName: string;
  industry: string;
  user: JwtPayload;
  clientId: string;
}

const CHAR_LIMITS: Record<string, number> = {
  li_headline: 220,
  li_about: 2000,
  ig_bio: 150,
  gbp_description: 750,
  gbp_review_responses: 1000,
  yt_about: 1000,
  yt_titles: 100,
  yt_descriptions: 5000,
  tw_bio: 160,
  tw_threads: 280,
  tt_bio: 80,
  tt_captions: 150,
  pin_profile: 500,
  pin_titles: 100,
  gads_ad_copy: 0,
  em_subject: 60,
  em_preview: 140,
  wa_auto_reply: 300,
  wa_quick_replies: 100,
};

function buildPrompt(checkId: string, brandName: string, industry: string, currentValue: string): string {
  const base = `Brand: ${brandName} (${industry})\nCurrent: "${currentValue}"\n`;

  const prompts: Record<string, string> = {
    li_headline: `${base}Rewrite this LinkedIn headline. Rules: max 220 chars, keyword-rich, value proposition not job title, no buzzwords like "passionate" or "guru". Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    li_about: `${base}Rewrite this LinkedIn About section. Rules: max 2000 chars, hook in first 2 lines before "see more", story arc, clear CTA, first person voice. Return 2 variants as JSON: [{"variant":"text","charCount":0}]`,
    li_experience: `${base}Rewrite these LinkedIn experience bullet points. Rules: start with action verbs, quantify results, max 3 bullets per role. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    ig_bio: `${base}Rewrite this Instagram bio. Rules: max 150 chars, emoji line breaks, clear niche, link-in-bio CTA. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    ig_captions: `${base}Write 3 Instagram caption variants for this brand. Rules: hook in first line, 1-3 paragraphs, 5 hashtags at end. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    gbp_description: `${base}Write a Google Business Profile description. Rules: max 750 chars, keyword-rich, include location/service area, USP, CTA, no first person. Return 2 variants as JSON: [{"variant":"text","charCount":0}]`,
    gbp_review_responses: `${base}Write a response to this Google review. Rules: personalised, max 150 words, professional tone, include business name once, end with invitation to return. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    yt_about: `${base}Write a YouTube channel description. Rules: max 1000 chars, keyword in first sentence, upload schedule, social links placeholder. Return 2 variants as JSON: [{"variant":"text","charCount":0}]`,
    yt_titles: `${base}Write YouTube video titles for this topic. Rules: max 100 chars, keyword near start, curiosity gap or number hook. Return 5 variants as JSON: [{"variant":"text","charCount":0}]`,
    yt_descriptions: `${base}Write a YouTube video description. Rules: first 200 chars visible before fold — make them count, keyword-rich, timestamps structure, subscribe CTA. Return 2 variants as JSON: [{"variant":"text","charCount":0}]`,
    tw_bio: `${base}Rewrite this Twitter/X bio. Rules: max 160 chars, keyword, personality, what you tweet about, optional CTA. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    tw_threads: `${base}Write a Twitter/X thread hook for this topic. Rules: first tweet max 280 chars, pattern interrupt, promise value. Return 3 hook variants as JSON: [{"variant":"text","charCount":0}]`,
    tt_bio: `${base}Rewrite this TikTok bio. Rules: max 80 chars, hook + niche + CTA, emoji allowed. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    tt_captions: `${base}Write TikTok captions. Rules: hook in first line (pattern interrupt), max 150 chars, 3-5 hashtags. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    pin_profile: `${base}Write a Pinterest profile bio. Rules: max 500 chars, keyword-rich, describes content pillars. Return 2 variants as JSON: [{"variant":"text","charCount":0}]`,
    pin_titles: `${base}Write Pinterest pin titles. Rules: keyword-rich, benefit-led, max 100 chars. Return 5 variants as JSON: [{"variant":"text","charCount":0}]`,
    gads_ad_copy: `${base}Generate Google Ads copy. Return JSON: {"headlines":["max 30 chars each",...15 items],"descriptions":["max 90 chars each",...4 items]}`,
    em_subject: `${base}Write email subject lines. Rules: max 60 chars, curiosity/urgency/benefit, A/B test pairs. Return 5 variants as JSON: [{"variant":"text","charCount":0}]`,
    em_preview: `${base}Write email preview text. Rules: max 140 chars, complements subject line, no repeat. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    wa_auto_reply: `${base}Write a WhatsApp business greeting message. Rules: max 300 chars, friendly, sets expectations, one CTA. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`,
    wa_quick_replies: `${base}Write WhatsApp quick reply messages. Return 5 quick replies as JSON: [{"label":"button label","message":"full reply text"}]`,
  };

  return prompts[checkId] ?? `${base}Improve this content for ${checkId}. Return 3 variants as JSON: [{"variant":"text","charCount":0}]`;
}

export async function getPlatformRewrites(params: RewriteParams): Promise<string> {
  const { checkId, currentValue, brandName, industry, user, clientId } = params;
  const prompt = buildPrompt(checkId, brandName, industry, currentValue);

  const { result } = await runAITool({
    toolId: 'platform_rewrite',
    systemPrompt: 'You are a platform optimization expert. Generate concise, ready-to-use rewrites. Always return valid JSON only. No preamble.',
    userPrompt: prompt,
    inputs: { checkId, currentValue: currentValue.substring(0, 500), brandName, industry },
    user,
    clientId,
  });

  return result;
}

export { CHAR_LIMITS };
