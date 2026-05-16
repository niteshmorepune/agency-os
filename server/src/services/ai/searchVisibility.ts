import { runAITool } from './client';
import type { JwtPayload } from '@agencyos/shared';

interface SearchVisibilityParams {
  brandName: string;
  website: string;
  industry: string;
  location: string;
  keyServices: string;
  targetKeywords: string;
  user: JwtPayload;
  clientId?: string;
  forceRefresh?: boolean;
}

export async function getSearchVisibilityAudit(params: SearchVisibilityParams): Promise<string> {
  const { brandName, website, industry, location, keyServices, targetKeywords, user, clientId, forceRefresh } = params;

  const prompt = `Brand: ${brandName}
Website: ${website}
Industry: ${industry}
Location: ${location}
Key services: ${keyServices}
Target keywords: ${targetKeywords}

Analyze this brand's AI Search Visibility (GEO – Generative Engine Optimization) readiness. Score each dimension 0-100 based on what AI search engines like ChatGPT Search, Perplexity, and Google AI Overviews prioritize.

Return ONLY a raw JSON object, no markdown:
{
  "overallScore": <0-100 integer>,
  "dimensions": [
    {"id":"schema","label":"Structured Data & Schema","score":<0-100>,"status":"<excellent|good|average|below_average|poor>","summary":"<1 sentence brand-specific diagnosis>"},
    {"id":"eeat","label":"E-E-A-T Signals","score":<0-100>,"status":"...","summary":"..."},
    {"id":"content","label":"Content Depth & FAQs","score":<0-100>,"status":"...","summary":"..."},
    {"id":"citations","label":"Citation & Mention Quality","score":<0-100>,"status":"...","summary":"..."},
    {"id":"knowledge","label":"Knowledge Panel Readiness","score":<0-100>,"status":"...","summary":"..."},
    {"id":"reputation","label":"Review & Reputation Signals","score":<0-100>,"status":"...","summary":"..."}
  ],
  "quickWins": [
    {"action":"<specific action referencing the brand/industry>","impact":"high|med|low","effort":"low|med"}
  ],
  "longTerm": [
    {"action":"<strategic action>","impact":"high","effort":"high|med"}
  ]
}

Rules:
- quickWins: exactly 4 items, all effort: low or med
- longTerm: exactly 3 items, all impact: high
- overallScore = weighted average: schema 15%, eeat 25%, content 25%, citations 15%, knowledge 10%, reputation 10%
- Status thresholds: 80+ excellent, 60-79 good, 40-59 average, 20-39 below_average, 0-19 poor
- Be brand-specific — reference the industry, location, and services in your analysis`;

  const { result } = await runAITool({
    toolId: 'search_visibility',
    systemPrompt: 'You are a GEO (Generative Engine Optimization) expert. You help brands appear in AI-powered search results from ChatGPT, Perplexity, Google AI Overviews, and Copilot. Always return valid JSON only. No preamble, no markdown.',
    userPrompt: prompt,
    inputs: {
      brandName,
      website: website.substring(0, 100),
      industry,
      location,
      targetKeywords: targetKeywords.substring(0, 200),
    },
    user,
    clientId,
    forceRefresh,
  });

  return result;
}
