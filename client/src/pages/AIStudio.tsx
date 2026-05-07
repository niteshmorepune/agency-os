import { useState } from 'react';
import { Bot, Sparkles, Copy, RefreshCw, Check } from 'lucide-react';
import { api } from '../api/client';
import { SafeAIOutput } from '../lib/safeAI';

interface Tool {
  id: string;
  name: string;
  description: string;
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'select'; options?: string[]; placeholder?: string }[];
  endpoint: string;
}

const TOOLS: Tool[] = [
  {
    id: 'caption',
    name: 'Caption Generator',
    description: 'Generate platform-optimized captions from a topic or brief',
    endpoint: '/ai/caption',
    fields: [
      { key: 'topic', label: 'Topic or brief', type: 'textarea', placeholder: 'E.g. Launching our new SaaS product for restaurant owners...' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Pinterest'] },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Conversational', 'Bold', 'Humorous', 'Educational'] },
      { key: 'cta', label: 'CTA Goal', type: 'text', placeholder: 'E.g. Drive website visits, get comments...' },
    ],
  },
  {
    id: 'bio',
    name: 'Profile Bio Optimizer',
    description: 'Optimize any social media bio for discoverability and conversion',
    endpoint: '/ai/bio',
    fields: [
      { key: 'currentBio', label: 'Current bio', type: 'textarea', placeholder: 'Paste the current bio here...' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'TikTok', 'Pinterest', 'YouTube'] },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'E.g. B2B startup founders in India' },
      { key: 'keywords', label: 'Top 3 keywords', type: 'text', placeholder: 'E.g. SaaS, B2B marketing, startup growth' },
    ],
  },
  {
    id: 'rewrite',
    name: 'Content Rewriter',
    description: 'Get 3 rewritten variants: professional, conversational, and bold',
    endpoint: '/ai/rewrite',
    fields: [
      { key: 'originalText', label: 'Original content', type: 'textarea', placeholder: 'Paste the content you want rewritten...' },
      { key: 'platform', label: 'Platform (optional)', type: 'select', options: ['LinkedIn', 'Instagram', 'Twitter', 'Email', 'Website', 'General'] },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'Who is this for?' },
    ],
  },
  {
    id: 'email',
    name: 'Email Copy Writer',
    description: 'Full email copy from subject line to CTA',
    endpoint: '/ai/email',
    fields: [
      { key: 'campaignGoal', label: 'Campaign goal', type: 'text', placeholder: 'E.g. Drive webinar sign-ups, promote Black Friday sale...' },
      { key: 'audienceSegment', label: 'Audience segment', type: 'text', placeholder: 'E.g. Trial users who haven\'t converted' },
      { key: 'offerDetails', label: 'Offer/details', type: 'textarea', placeholder: 'Describe the offer, event, or key information...' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Warm', 'Urgent', 'Educational', 'Conversational'] },
    ],
  },
  {
    id: 'ad-copy',
    name: 'Ad Copy Generator',
    description: 'Google Ads and Meta Ads copy optimized for conversion',
    endpoint: '/ai/ad-copy',
    fields: [
      { key: 'product', label: 'Product/Service', type: 'text', placeholder: 'E.g. CRM software for small businesses' },
      { key: 'usp', label: 'Unique selling point', type: 'text', placeholder: 'What makes you different?' },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'E.g. SMB owners in India' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['GOOGLE', 'META'] },
    ],
  },
  {
    id: 'thread',
    name: 'Thread / Carousel Writer',
    description: 'LinkedIn carousel or Twitter/X thread from any topic',
    endpoint: '/ai/thread',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'E.g. 10 mistakes founders make with their LinkedIn...' },
      { key: 'keyInsight', label: 'Key insight or data point', type: 'text', placeholder: 'The main thing you want to convey' },
      { key: 'targetAudience', label: 'Target audience', type: 'text', placeholder: 'E.g. SaaS founders, marketing managers' },
      { key: 'format', label: 'Format', type: 'select', options: ['twitter', 'linkedin_carousel'] },
    ],
  },
  {
    id: 'hashtags',
    name: 'Hashtag Research Tool',
    description: 'Generate strategic hashtag sets by size tier',
    endpoint: '/ai/hashtags',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'E.g. Digital marketing for restaurants' },
      { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'LinkedIn', 'TikTok', 'Twitter', 'Pinterest'] },
      { key: 'niche', label: 'Niche (optional)', type: 'text', placeholder: 'E.g. food & beverage, SaaS, fitness' },
    ],
  },
  {
    id: 'persona',
    name: 'Audience Persona Builder',
    description: 'Build a detailed audience persona from minimal inputs',
    endpoint: '/ai/persona',
    fields: [
      { key: 'industry', label: 'Industry', type: 'text', placeholder: 'E.g. B2B SaaS, Restaurant, E-commerce' },
      { key: 'product', label: 'Product/Service', type: 'text', placeholder: 'What do you sell?' },
      { key: 'customerDescription', label: 'Existing customer description', type: 'textarea', placeholder: 'Describe your typical customer...' },
      { key: 'platform', label: 'Primary platform', type: 'select', options: ['LinkedIn', 'Instagram', 'YouTube', 'TikTok', 'Email', 'Multi-platform'] },
    ],
  },
];

function ToolCard({ tool, onSelect }: { tool: Tool; onSelect: (t: Tool) => void }) {
  return (
    <button onClick={() => onSelect(tool)} className="card p-5 text-left hover:shadow-md hover:border-primary-200 transition-all group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
          <Sparkles size={18} className="text-primary-700" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">{tool.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{tool.description}</p>
        </div>
      </div>
    </button>
  );
}

function ToolRunner({ tool, onBack }: { tool: Tool; onBack: () => void }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ data: string; cached: boolean }>(tool.endpoint, inputs);
      setResult(res.data);
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
        <button onClick={onBack} className="btn-secondary text-sm py-1.5 px-3">← Back</button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{tool.name}</h2>
          <p className="text-sm text-gray-500">{tool.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Input</h3>
          {tool.fields.map(field => (
            <div key={field.key}>
              <label className="label">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder={field.placeholder}
                  value={inputs[field.key] ?? ''}
                  onChange={e => setInputs(p => ({ ...p, [field.key]: e.target.value }))}
                />
              ) : field.type === 'select' ? (
                <select className="input" value={inputs[field.key] ?? ''} onChange={e => setInputs(p => ({ ...p, [field.key]: e.target.value }))}>
                  <option value="">Select...</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" className="input" placeholder={field.placeholder} value={inputs[field.key] ?? ''} onChange={e => setInputs(p => ({ ...p, [field.key]: e.target.value }))} />
              )}
            </div>
          ))}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button onClick={handleRun} disabled={loading} className="btn-primary w-full">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">AI Output</h3>
            {result && (
              <button onClick={handleCopy} className="btn-secondary text-xs py-1 px-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIStudio() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  if (selectedTool) {
    return <ToolRunner tool={selectedTool} onBack={() => setSelectedTool(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Studio</h1>
        <p className="text-gray-500 mt-1">Powered by Claude — generate platform-optimized content in seconds.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map(tool => <ToolCard key={tool.id} tool={tool} onSelect={setSelectedTool} />)}
      </div>
    </div>
  );
}
