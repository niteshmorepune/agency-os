import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, CheckCircle2, AlertTriangle, XCircle,
  Clock, Minus, Sparkles, ChevronDown, ChevronUp, MessageSquare, Flag,
} from 'lucide-react';
import { api } from '../api/client';

interface AuditCheckRow {
  id: string;
  moduleId: string;
  checkId: string;
  status: 'PENDING' | 'PASS' | 'WARN' | 'FAIL' | 'NA';
  score: number | null;
  weight: number;
  aiSuggestion: string | null;
  data: unknown;
  lastCheckedAt: string | null;
}

interface ModuleProgress {
  moduleId: string;
  name: string;
  icon: string;
  score: number | null;
  passed: number;
  warned: number;
  failed: number;
  pending: number;
  total: number;
}

interface AuditNote {
  id: string;
  content: string;
  isInternal: boolean;
  checkId: string | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

interface AuditFull {
  id: string;
  name: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
  checks: AuditCheckRow[];
  notes: AuditNote[];
  moduleProgress: ModuleProgress[];
}

const CHECK_DEFS: Record<string, { name: string; description?: string; benchmark?: string; howToCheck?: string }> = {
  // Website
  ws_ssl: { name: 'SSL Certificate', description: 'HTTPS active, valid cert, no mixed-content warnings', benchmark: 'Green padlock in all browsers' },
  ws_pagespeed_mobile: { name: 'PageSpeed — Mobile', description: 'Google PSI mobile score', benchmark: '≥ 70 Good, ≥ 90 Excellent' },
  ws_pagespeed_desktop: { name: 'PageSpeed — Desktop', description: 'Google PSI desktop score', benchmark: '≥ 90 Good' },
  ws_mobile_friendly: { name: 'Mobile-Friendly Design', description: 'Responsive layout, no horizontal scroll, tap targets ≥ 48px' },
  ws_core_web_vitals: { name: 'Core Web Vitals', description: 'LCP < 2.5s, INP < 200ms, CLS < 0.1', benchmark: 'All three in "Good" range' },
  ws_meta_tags: { name: 'Meta Title & Description', description: 'Homepage has unique title (50–60 chars) and meta description (150–160 chars)' },
  ws_schema: { name: 'Schema Markup', description: 'JSON-LD structured data', howToCheck: 'Google Rich Results Test' },
  ws_sitemap: { name: 'XML Sitemap', description: 'Sitemap.xml exists, submitted to GSC' },
  ws_robots: { name: 'Robots.txt', description: 'robots.txt present, not blocking important resources' },
  ws_404: { name: '404 Page & Redirects', description: 'Custom 404 page, broken links fixed, 301 redirects in place' },
  ws_analytics: { name: 'Analytics Tracking', description: 'GA4 or equivalent installed, goals configured' },
  ws_cta: { name: 'CTA Visibility', description: 'Clear primary CTA above the fold' },
  // SEO
  seo_title_tags: { name: 'Title Tags — All Key Pages', description: 'Unique, keyword-rich titles on all major pages', benchmark: '50–60 characters' },
  seo_meta_desc: { name: 'Meta Descriptions', description: 'Unique, compelling meta descriptions with CTA and keywords' },
  seo_h1_structure: { name: 'H1 & Heading Structure', description: 'One H1 per page with primary keyword, logical H2/H3 hierarchy' },
  seo_keyword_targeting: { name: 'Keyword Targeting', description: 'Target keyword in title, H1, first paragraph, and URL slug' },
  seo_content_length: { name: 'Content Depth', description: 'Key service pages ≥ 500 words; blog posts ≥ 800 words' },
  seo_alt_tags: { name: 'Image Alt Tags', description: 'All images have descriptive alt text with relevant keywords' },
  seo_internal_linking: { name: 'Internal Linking', description: 'Pages link to each other logically; no orphan pages' },
  seo_backlinks: { name: 'Backlink Profile', description: 'Domain Authority, referring domains, toxic link ratio', howToCheck: 'Ahrefs or Moz' },
  seo_local: { name: 'Local SEO Signals', description: 'NAP consistent across web, local keywords in content' },
  seo_url_structure: { name: 'URL Structure', description: 'Short, descriptive, hyphenated URLs' },
  seo_canonical: { name: 'Canonical Tags', description: 'Canonical tags on duplicate pages; www vs non-www resolved' },
  // GMB
  gmb_claimed: { name: 'Profile Claimed & Verified', benchmark: 'Essential — without this nothing else matters' },
  gmb_nap: { name: 'NAP Consistency', description: 'Name, Address, Phone exactly match website and all directories' },
  gmb_categories: { name: 'Primary & Secondary Categories', description: '3–5 secondary categories selected' },
  gmb_description: { name: 'Business Description', description: '750-char description with primary keywords' },
  gmb_photos: { name: 'Photo Count & Quality', description: '100+ photos: exterior, interior, team, products' },
  gmb_posts: { name: 'GBP Post Frequency', description: 'Weekly posts — offers, events, updates, products' },
  gmb_reviews_volume: { name: 'Review Volume', description: '50+ reviews; actively requesting reviews' },
  gmb_reviews_rating: { name: 'Review Rating', benchmark: '4.5+ strongly preferred by Google' },
  gmb_responses: { name: 'Review Response Rate', description: '100% of reviews responded to within 24 hours' },
  gmb_qa: { name: 'Q&A Management', description: 'All questions answered within 7 days' },
  gmb_services: { name: 'Services / Menu Listed', description: 'All services with descriptions and prices' },
  gmb_attributes: { name: 'Business Attributes', description: 'Accessibility, payment methods, amenities all filled' },
  // Social
  sm_profiles_complete: { name: 'All Profiles 100% Complete', description: 'Every active platform has photo, cover, bio, website, CTA' },
  sm_brand_consistency: { name: 'Brand Consistency', description: 'Same logo, colours, tone across all platforms' },
  sm_posting_frequency: { name: 'Posting Frequency', description: 'Instagram 5–7x/week, LinkedIn 3–5x, Facebook 5x, YouTube 1x' },
  sm_content_variety: { name: 'Content Format Variety', description: 'Mix of Reels, carousels, static posts, stories, live' },
  sm_engagement_rate: { name: 'Engagement Rate', description: 'Instagram ≥ 3%, LinkedIn ≥ 2%, Facebook ≥ 1%' },
  sm_response_time: { name: 'DM & Comment Response Time', benchmark: '< 1 hour is excellent' },
  sm_hashtag_strategy: { name: 'Hashtag Strategy', description: 'Niche + medium + broad hashtag mix; no banned hashtags' },
  sm_stories_highlights: { name: 'Stories & Highlights Active', description: '5+ active story highlights with branded covers' },
  sm_link_in_bio: { name: 'Link in Bio / Linktree', description: 'Links to key pages (booking, product, WhatsApp)' },
  sm_collab_ugc: { name: 'Collaborations & UGC', description: 'Regular collabs; UGC reposts with credit' },
  // Content
  cs_blog_active: { name: 'Blog / Articles Active', description: 'At least 2 high-quality articles per month' },
  cs_keyword_targeting: { name: 'Content Targets Keywords', description: 'Each article targets a specific keyword with search intent' },
  cs_content_depth: { name: 'Content Depth & Quality', description: 'Articles are comprehensive (1,000+ words for competitive terms)' },
  cs_cta_usage: { name: 'CTA in Every Piece', description: 'Every article has a clear CTA' },
  cs_lead_magnets: { name: 'Lead Magnets / Downloadables', description: 'PDF guides, checklists, or webinars for email capture' },
  cs_video_content: { name: 'Video Content Present', description: 'YouTube channel active or video content on website/social' },
  cs_content_calendar: { name: 'Content Calendar in Use', description: 'Planned 4–8 weeks ahead, tied to business goals' },
  cs_repurposing: { name: 'Content Repurposing System', description: 'Each piece used across 5+ channels' },
  cs_email_newsletter: { name: 'Email Newsletter Active', description: 'Regular newsletter (min. monthly) to segmented list' },
  cs_analytics_driven: { name: 'Content Decisions Data-Driven', description: 'Top performers reproduced; underperformers audited' },
  // Ads
  ads_google_active: { name: 'Google Ads Account Active', description: 'Campaigns running with current budget and up-to-date ad copy' },
  ads_meta_active: { name: 'Meta Ads Account Active', description: 'Facebook/Instagram campaigns running' },
  ads_conversion_tracking: { name: 'Conversion Tracking Set Up', benchmark: 'Without this, optimisation is impossible' },
  ads_remarketing: { name: 'Remarketing Audiences Active', description: 'Website visitor, customer list, and lookalike audiences' },
  ads_ad_copy_quality: { name: 'Ad Copy Quality', description: 'Responsive search ads with 15 headlines, 4 descriptions' },
  ads_landing_pages: { name: 'Dedicated Landing Pages', description: 'Message match between ad and landing page' },
  ads_quality_score: { name: 'Google Quality Score', benchmark: 'QS 7–10 = below-average CPC' },
  ads_ctr: { name: 'Click-Through Rate', description: 'Google Search CTR ≥ 5%, Meta CTR ≥ 1.5%' },
  ads_roas: { name: 'Return on Ad Spend (ROAS)', description: 'ROAS tracked per campaign' },
  ads_negative_keywords: { name: 'Negative Keyword List', description: 'Comprehensive list preventing wasted spend' },
  // Email
  em_list_size: { name: 'Email List Size', benchmark: '> 1,000 is a functional list' },
  em_list_hygiene: { name: 'List Hygiene', description: 'Bounce rate < 2%, list cleaned quarterly' },
  em_open_rate: { name: 'Open Rate', benchmark: '> 20% good; > 30% excellent' },
  em_click_rate: { name: 'Click-Through Rate', benchmark: '> 2.5% good; > 5% excellent' },
  em_welcome_sequence: { name: 'Welcome Sequence Active', description: '3–5 email welcome series triggered on signup' },
  em_abandon_cart: { name: 'Abandoned Cart / Lead Sequence', description: '3-email sequence on cart abandonment' },
  em_segmentation: { name: 'List Segmentation', description: 'Segmented by behaviour, purchase history, or interest' },
  em_subject_lines: { name: 'Subject Line Optimisation', benchmark: '< 50 characters performs best on mobile' },
  em_mobile_optimised: { name: 'Mobile-Optimised Templates', description: 'Single-column layouts, large text, tested on iOS/Android' },
  em_spf_dkim: { name: 'SPF / DKIM / DMARC Records', benchmark: 'Without these, emails go to spam' },
};

const STATUS_OPTIONS = [
  { value: 'PASS', label: 'Pass', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  { value: 'WARN', label: 'Warn', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { value: 'FAIL', label: 'Fail', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  { value: 'NA', label: 'N/A', icon: Minus, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
  { value: 'PENDING', label: 'Pending', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-50 border-blue-200' },
];

function statusStyle(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[4];
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

function ScoreRing({ score }: { score: number | null }) {
  const s = score ?? 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (s / 100) * circ;
  const color = score === null ? '#94a3b8' : score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 45 45)" />
      <text x="45" y="45" textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="800" fill={color}>{score ?? '—'}</text>
    </svg>
  );
}

function CheckRow({ check, clientId, auditId }: { check: AuditCheckRow; clientId: string; auditId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const qc = useQueryClient();
  const def = CHECK_DEFS[check.checkId];

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.put(`/audit/${clientId}/${auditId}/check/${check.id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', clientId, auditId] }),
    onError: () => toast.error('Failed to update check'),
  });

  async function getAISuggestion() {
    setLoadingAI(true);
    try {
      await api.post(`/audit/${clientId}/${auditId}/check/${check.id}/ai-suggest`, {});
      qc.invalidateQueries({ queryKey: ['audit', clientId, auditId] });
    } finally {
      setLoadingAI(false);
    }
  }

  const st = statusStyle(check.status);
  const Icon = st.icon;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${check.status === 'PASS' ? 'border-green-100' : check.status === 'FAIL' ? 'border-red-100' : check.status === 'WARN' ? 'border-yellow-100' : 'border-gray-100'}`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Icon size={18} className={`flex-shrink-0 ${st.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{def?.name ?? check.checkId}</p>
          {def?.description && !expanded && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{def.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 font-medium">{check.weight}×</span>
          {check.aiSuggestion && <span title="AI suggestion available"><Sparkles size={14} className="text-purple-400" /></span>}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-4 bg-white">
          {def?.description && <p className="text-sm text-gray-600">{def.description}</p>}
          {def?.benchmark && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <Flag size={12} className="flex-shrink-0" />
              <span><strong>Benchmark:</strong> {def.benchmark}</span>
            </div>
          )}
          {def?.howToCheck && (
            <p className="text-xs text-gray-500">How to check: {def.howToCheck}</p>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateMutation.mutate(opt.value)}
                  disabled={updateMutation.isPending}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${check.status === opt.value ? `${opt.bg} ${opt.color} font-semibold` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <opt.icon size={13} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {check.aiSuggestion ? (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-1">
                <Sparkles size={13} /> AI Recommendation
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{check.aiSuggestion}</p>
              <button onClick={getAISuggestion} disabled={loadingAI} className="text-xs text-purple-600 hover:text-purple-800 mt-1">
                {loadingAI ? 'Refreshing…' : '↺ Refresh'}
              </button>
            </div>
          ) : (
            <button
              onClick={getAISuggestion}
              disabled={loadingAI}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              <Sparkles size={15} />
              {loadingAI ? 'Getting AI suggestion…' : 'Get AI Recommendation'}
            </button>
          )}

          {check.lastCheckedAt && (
            <p className="text-xs text-gray-400">Last updated: {new Date(check.lastCheckedAt).toLocaleString('en-IN')}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleSection({ mod, checks, clientId, auditId }: {
  mod: ModuleProgress;
  checks: AuditCheckRow[];
  clientId: string;
  auditId: string;
}) {
  const [open, setOpen] = useState(true);
  const modChecks = checks.filter(c => c.moduleId === mod.moduleId);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xl">{mod.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{mod.name}</h3>
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
            <span className="text-green-600 font-medium">{mod.passed} ✓</span>
            <span className="text-yellow-600 font-medium">{mod.warned} ⚠</span>
            <span className="text-red-500 font-medium">{mod.failed} ✗</span>
            {mod.pending > 0 && <span className="text-gray-400">{mod.pending} pending</span>}
          </div>
        </div>
        <div className={`text-2xl font-bold ${scoreColor(mod.score)}`}>
          {mod.score ?? '—'}
        </div>
        <div className="w-24 bg-gray-100 rounded-full h-2 mx-2">
          {mod.score !== null && (
            <div
              className={`h-2 rounded-full ${mod.score >= 80 ? 'bg-green-500' : mod.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${mod.score}%` }}
            />
          )}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="p-4 pt-0 space-y-2">
          {modChecks.map(c => (
            <CheckRow key={c.id} check={c} clientId={clientId} auditId={auditId} />
          ))}
        </div>
      )}
    </div>
  );
}

const MODULES = [
  { id: 'website', name: 'Website & Technical', icon: '🌐' },
  { id: 'seo', name: 'On-Page SEO', icon: '🔍' },
  { id: 'gmb', name: 'Google Business Profile', icon: '📍' },
  { id: 'social', name: 'Social Media Presence', icon: '📱' },
  { id: 'content', name: 'Content Strategy', icon: '✍️' },
  { id: 'ads', name: 'Paid Advertising', icon: '💰' },
  { id: 'email', name: 'Email Marketing', icon: '📧' },
];

export default function AuditDetail() {
  const { clientId, auditId } = useParams<{ clientId: string; auditId: string }>();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit', clientId, auditId],
    queryFn: () => api.get<{ data: AuditFull }>(`/audit/${clientId}/${auditId}`),
    enabled: !!clientId && !!auditId,
  });

  const completeMutation = useMutation({
    mutationFn: () => api.put(`/audit/${clientId}/${auditId}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit', clientId, auditId] });
      toast.success('Audit marked complete');
    },
    onError: () => toast.error('Failed to complete audit'),
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => api.post(`/audit/${clientId}/${auditId}/note`, { content, isInternal: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit', clientId, auditId] });
      setNoteText('');
    },
  });

  const audit = data?.data;

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );

  if (isError || !audit) return (
    <div className="card p-16 text-center">
      <p className="text-gray-500">Audit not found.</p>
      <Link to={`/audit/${clientId}`} className="text-primary-600 hover:underline mt-2 inline-block">← Back to audits</Link>
    </div>
  );

  const filteredModules = activeModule
    ? audit.moduleProgress.filter(m => m.moduleId === activeModule)
    : audit.moduleProgress;

  const totalChecks = audit.checks.length;
  const passedTotal = audit.checks.filter(c => c.status === 'PASS').length;
  const pendingTotal = audit.checks.filter(c => c.status === 'PENDING').length;
  const completionPct = totalChecks > 0 ? Math.round(((totalChecks - pendingTotal) / totalChecks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to={`/audit/${clientId}`} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{audit.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${audit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : audit.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
              {audit.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500">{completionPct}% complete · {passedTotal}/{totalChecks} passed</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {audit.status === 'IN_PROGRESS' && (
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="btn-primary text-sm"
            >
              {completeMutation.isPending ? 'Saving…' : 'Mark Complete'}
            </button>
          )}
          <a
            href={`/api/audit/${clientId}/${auditId}/report`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download size={16} /> PDF Report
          </a>
        </div>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4 md:col-span-1">
          <ScoreRing score={audit.overallScore} />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Overall</p>
            <p className="text-sm text-gray-600 mt-0.5">{completionPct}% reviewed</p>
          </div>
        </div>
        {[
          { label: 'Passed', value: passedTotal, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Warnings', value: audit.checks.filter(c => c.status === 'WARN').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Failed', value: audit.checks.filter(c => c.status === 'FAIL').length, color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`card p-5 text-center ${s.bg}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Module sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1">
          <button
            onClick={() => setActiveModule(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeModule === null ? 'bg-primary-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            All Modules
          </button>
          {MODULES.map(mod => {
            const prog = audit.moduleProgress.find(m => m.moduleId === mod.id);
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeModule === mod.id ? 'bg-primary-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <span>{mod.icon}</span>
                <span className="flex-1 truncate">{mod.name}</span>
                {prog && <span className={`text-xs font-bold flex-shrink-0 ${activeModule === mod.id ? 'text-white opacity-75' : scoreColor(prog.score)}`}>{prog.score ?? '—'}</span>}
              </button>
            );
          })}
        </div>

        {/* Check list */}
        <div className="flex-1 min-w-0 space-y-4">
          {filteredModules.map(mod => (
            <ModuleSection
              key={mod.moduleId}
              mod={mod}
              checks={audit.checks}
              clientId={clientId!}
              auditId={auditId!}
            />
          ))}
        </div>
      </div>

      {/* Notes section */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MessageSquare size={16} /> Audit Notes</h3>
        <div className="flex gap-3">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            className="input flex-1 resize-none"
            rows={2}
            placeholder="Add an internal note…"
          />
          <button
            onClick={() => { if (noteText.trim()) noteMutation.mutate(noteText.trim()); }}
            disabled={!noteText.trim() || noteMutation.isPending}
            className="btn-primary self-end"
          >
            Add
          </button>
        </div>
        {audit.notes.length > 0 && (
          <div className="space-y-3">
            {audit.notes.map(note => (
              <div key={note.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                  {note.author.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{note.author.name}</span>
                    <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
