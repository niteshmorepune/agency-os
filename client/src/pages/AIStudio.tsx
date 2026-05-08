import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, Sparkles, Copy, RefreshCw, Check, BarChart2, ChevronLeft, Database, Users, Clock, TrendingUp } from 'lucide-react';
import { api } from '../api/client';
import { SafeAIOutput } from '../lib/safeAI';

interface ToolField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: ToolField[];
  endpoint: string;
  numberFields?: string[];
  arrayFields?: string[];
  customPage?: string;
}

interface ClientBasic {
  id: string;
  name: string;
  status: string;
}

const CATEGORIES = ['All', 'Content', 'Social', 'Ads', 'Research', 'Email & Reviews'] as const;

const CATEGORY_COLOR: Record<string, string> = {
  Content: 'bg-violet-100 text-violet-700',
  Social: 'bg-pink-100 text-pink-700',
  Ads: 'bg-amber-100 text-amber-700',
  Research: 'bg-sky-100 text-sky-700',
  'Email & Reviews': 'bg-emerald-100 text-emerald-700',
};

const TOOLS: Tool[] = [
  {
    id: 'caption',
    category: 'Content',
    name: 'Caption Generator',
    description: 'Generate 5 platform-optimized caption variants from a topic or brief',
    endpoint: '/ai/caption',
    fields: [
      { key: 'topic', label: 'Topic or brief', type: 'textarea', placeholder: 'E.g. Launching our new SaaS product for restaurant owners...', required: true },
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Pinterest'] },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Conversational', 'Bold', 'Humorous', 'Educational'] },
      { key: 'cta', label: 'CTA Goal', type: 'text', placeholder: 'E.g. Drive website visits, get comments...' },
    ],
  },
  {
    id: 'post-ideas',
    category: 'Content',
    name: 'Post Ideas Generator',
    description: '30 fresh content ideas with hooks, formats, and outlines',
    endpoint: '/ai/post-ideas',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Pinterest', 'YouTube'], required: true },
      { key: 'niche', label: 'Niche', type: 'text', placeholder: 'E.g. B2B SaaS, Food & Beverage, Fitness', required: true },
      { key: 'goal', label: 'Content goal', type: 'select', options: ['Engagement & growth', 'Lead generation', 'Brand awareness', 'Sales conversion', 'Community building'] },
      { key: 'themesToAvoid', label: 'Themes to avoid', type: 'text', placeholder: 'E.g. competitor mentions, controversial topics...' },
    ],
  },
  {
    id: 'thread',
    category: 'Content',
    name: 'Thread / Carousel Writer',
    description: 'LinkedIn carousel or Twitter/X thread from any topic',
    endpoint: '/ai/thread',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'E.g. 10 mistakes founders make with their LinkedIn...', required: true },
      { key: 'keyInsight', label: 'Key insight or data point', type: 'text', placeholder: 'The main thing you want to convey' },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'E.g. SaaS founders, marketing managers' },
      { key: 'format', label: 'Format', type: 'select', options: ['twitter', 'linkedin_carousel'] },
    ],
  },
  {
    id: 'rewrite',
    category: 'Content',
    name: 'Content Rewriter',
    description: 'Get 3 rewritten variants: professional, conversational, and bold',
    endpoint: '/ai/rewrite',
    fields: [
      { key: 'originalText', label: 'Original content', type: 'textarea', placeholder: 'Paste the content you want rewritten...', required: true },
      { key: 'platform', label: 'Platform (optional)', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'Email', 'Website', 'General'] },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'Who is this for?' },
    ],
  },
  {
    id: 'repurpose',
    category: 'Content',
    name: 'Content Repurposer',
    description: 'Transform one piece of content into 10 platform-native formats',
    endpoint: '/ai/repurpose',
    fields: [
      { key: 'sourceContent', label: 'Source content', type: 'textarea', placeholder: 'Paste your blog post, video script, podcast transcript...', required: true },
      { key: 'sourceType', label: 'Source type', type: 'select', options: ['blog', 'video', 'podcast'] },
      { key: 'targetPlatforms', label: 'Target platforms (comma-separated)', type: 'text', placeholder: 'E.g. LinkedIn, Twitter, Instagram, Email' },
    ],
    arrayFields: ['targetPlatforms'],
  },
  {
    id: 'bio',
    category: 'Social',
    name: 'Profile Bio Optimizer',
    description: 'Optimize any social media bio for discoverability and conversion',
    endpoint: '/ai/bio',
    fields: [
      { key: 'currentBio', label: 'Current bio', type: 'textarea', placeholder: 'Paste the current bio here...', required: true },
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'TikTok', 'Pinterest', 'YouTube'] },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'E.g. B2B startup founders in India' },
      { key: 'keywords', label: 'Top 3 keywords', type: 'text', placeholder: 'E.g. SaaS, B2B marketing, startup growth' },
    ],
  },
  {
    id: 'hashtags',
    category: 'Social',
    name: 'Hashtag Research Tool',
    description: 'Generate 30 strategic hashtags across 3 tier levels',
    endpoint: '/ai/hashtags',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'E.g. Digital marketing for restaurants', required: true },
      { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'LinkedIn', 'TikTok', 'Twitter', 'Pinterest'] },
      { key: 'niche', label: 'Niche (optional)', type: 'text', placeholder: 'E.g. food & beverage, SaaS, fitness' },
    ],
  },
  {
    id: 'ad-copy',
    category: 'Ads',
    name: 'Ad Copy Generator',
    description: 'Google Ads and Meta Ads copy optimized for conversion',
    endpoint: '/ai/ad-copy',
    fields: [
      { key: 'product', label: 'Product/Service', type: 'text', placeholder: 'E.g. CRM software for small businesses', required: true },
      { key: 'usp', label: 'Unique selling point', type: 'text', placeholder: 'What makes you different?' },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'E.g. SMB owners in India' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['GOOGLE', 'META'] },
    ],
  },
  {
    id: 'persona',
    category: 'Research',
    name: 'Audience Persona Builder',
    description: 'Build a detailed audience persona from minimal inputs',
    endpoint: '/ai/persona',
    fields: [
      { key: 'industry', label: 'Industry', type: 'text', placeholder: 'E.g. B2B SaaS, Restaurant, E-commerce', required: true },
      { key: 'product', label: 'Product/Service', type: 'text', placeholder: 'What do you sell?' },
      { key: 'customerDescription', label: 'Existing customer description', type: 'textarea', placeholder: 'Describe your typical customer...' },
      { key: 'platform', label: 'Primary platform', type: 'select', options: ['LinkedIn', 'Instagram', 'YouTube', 'TikTok', 'Email', 'Multi-platform'] },
    ],
  },
  {
    id: 'competitor-analysis',
    category: 'Research',
    name: 'Competitor Analyzer',
    description: 'Find content gaps and positioning opportunities vs competitors',
    endpoint: '/ai/competitor-analysis',
    fields: [
      { key: 'competitorHandles', label: 'Competitor handles or names', type: 'text', placeholder: 'E.g. @competitor1, @competitor2', required: true },
      { key: 'clientNiche', label: 'Your niche', type: 'text', placeholder: 'E.g. B2B fintech, health & wellness app' },
      { key: 'currentThemes', label: 'Themes you already cover', type: 'text', placeholder: 'Topics to avoid duplicating...' },
    ],
  },
  {
    id: 'email',
    category: 'Email & Reviews',
    name: 'Email Copy Writer',
    description: 'Full email copy from subject line to CTA',
    endpoint: '/ai/email',
    fields: [
      { key: 'campaignGoal', label: 'Campaign goal', type: 'text', placeholder: 'E.g. Drive webinar sign-ups, promote Black Friday sale...', required: true },
      { key: 'audienceSegment', label: 'Audience segment', type: 'text', placeholder: "E.g. Trial users who haven't converted" },
      { key: 'offerDetails', label: 'Offer/details', type: 'textarea', placeholder: 'Describe the offer, event, or key information...' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Warm', 'Urgent', 'Educational', 'Conversational'] },
    ],
  },
  {
    id: 'review-response',
    category: 'Email & Reviews',
    name: 'Review Response Generator',
    description: 'Craft professional, on-brand responses to customer reviews',
    endpoint: '/ai/review-response',
    fields: [
      { key: 'reviewText', label: 'Review text', type: 'textarea', placeholder: 'Paste the customer review here...', required: true },
      { key: 'starRating', label: 'Star rating', type: 'select', options: ['1', '2', '3', '4', '5'] },
      { key: 'businessType', label: 'Business type', type: 'text', placeholder: 'E.g. restaurant, SaaS, e-commerce' },
    ],
    numberFields: ['starRating'],
  },
  {
    id: 'posting-times',
    category: 'Research',
    name: 'Posting Time Optimizer',
    description: 'Evidence-based optimal posting schedule per platform and audience location',
    endpoint: '/ai/posting-times',
    fields: [],
    customPage: '/ai-studio/posting-times',
  },
  {
    id: 'engagement',
    category: 'Research',
    name: 'Engagement Rate Analyzer',
    description: 'Calculate engagement rate, benchmark against industry, get AI improvement tips',
    endpoint: '/ai/engagement-analyze',
    fields: [],
    customPage: '/ai-studio/engagement',
  },
];

const TOOL_ICON: Record<string, React.ReactNode> = {
  'posting-times': <Clock size={18} className="text-primary-700" />,
  'engagement': <TrendingUp size={18} className="text-primary-700" />,
};

function ToolCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-5 text-left hover:shadow-md hover:border-primary-200 transition-all group w-full">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
          {TOOL_ICON[tool.id] ?? <Sparkles size={18} className="text-primary-700" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">{tool.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CATEGORY_COLOR[tool.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {tool.category}
            </span>
          </div>
          <p className="text-sm text-gray-500">{tool.description}</p>
        </div>
      </div>
    </button>
  );
}

function ToolRunner({ tool, onBack }: { tool: Tool; onBack: () => void }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [result, setResult] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
    staleTime: 60_000,
  });
  const clients = (clientsData?.data ?? []).filter(c => c.status === 'ACTIVE');

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...inputs };
      if (clientId) payload.clientId = clientId;
      if (forceRefresh) payload.forceRefresh = true;
      for (const key of (tool.numberFields ?? [])) {
        if (payload[key] !== undefined && payload[key] !== '') {
          payload[key] = Number(payload[key]);
        }
      }
      for (const key of (tool.arrayFields ?? [])) {
        if (typeof payload[key] === 'string') {
          payload[key] = (payload[key] as string).split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      const res = await api.post<{ data: string; cached: boolean }>(tool.endpoint, payload);
      setResult(res.data);
      setIsCached(res.cached);
      setForceRefresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{tool.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[tool.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {tool.category}
            </span>
            {isCached && result && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                <Database size={11} /> Cached
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{tool.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Input</h3>
            {clients.length > 0 && (
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-400" />
                <select
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                >
                  <option value="">No client context</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {tool.fields.map(field => (
            <div key={field.key}>
              <label className="label">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder={field.placeholder}
                  value={inputs[field.key] ?? ''}
                  onChange={e => setInputs(p => ({ ...p, [field.key]: e.target.value }))}
                />
              ) : field.type === 'select' ? (
                <select
                  className="input"
                  value={inputs[field.key] ?? ''}
                  onChange={e => setInputs(p => ({ ...p, [field.key]: e.target.value }))}
                >
                  <option value="">Select...</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder={field.placeholder}
                  value={inputs[field.key] ?? ''}
                  onChange={e => setInputs(p => ({ ...p, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center gap-3">
            <button onClick={handleRun} disabled={loading} className="btn-primary flex-1">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Generating...' : 'Generate with AI'}
            </button>
            {result && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none flex-shrink-0">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={forceRefresh}
                  onChange={e => setForceRefresh(e.target.checked)}
                />
                Skip cache
              </label>
            )}
          </div>
        </div>

        {/* Output panel */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">AI Output</h3>
            {result && (
              <button onClick={handleCopy} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          {result ? (
            <SafeAIOutput content={result.replace(/\n/g, '<br>')} className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Bot size={40} className="mb-3" />
              <p className="text-sm">Your AI output will appear here</p>
              {clientId && clients.length > 0 && (
                <p className="text-xs mt-1 text-primary-400">
                  Context: {clients.find(c => c.id === clientId)?.name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIStudio() {
  const { toolId } = useParams<{ toolId?: string }>();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const activeTool = toolId ? (TOOLS.find(t => t.id === toolId) ?? null) : null;

  if (activeTool) {
    return <ToolRunner tool={activeTool} onBack={() => navigate('/ai-studio')} />;
  }

  const filtered = activeCategory === 'All' ? TOOLS : TOOLS.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Studio</h1>
          <p className="text-gray-500 mt-1">Powered by Claude — {TOOLS.length} tools for platform-optimized content.</p>
        </div>
        <Link to="/ai-studio/usage" className="btn-secondary text-sm flex items-center gap-2 flex-shrink-0">
          <BarChart2 size={16} />
          Usage Dashboard
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeCategory === cat
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            {cat}
            {cat !== 'All' && (
              <span className="ml-1.5 text-xs opacity-70">
                {TOOLS.filter(t => t.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(tool => (
          <ToolCard key={tool.id} tool={tool} onClick={() => navigate(tool.customPage ?? `/ai-studio/${tool.id}`)} />
        ))}
      </div>
    </div>
  );
}
