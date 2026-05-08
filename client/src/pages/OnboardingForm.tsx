import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/client';

interface AgencyBranding { name: string; logoUrl?: string | null; primaryColor?: string | null }
interface TokenData { clientName: string; agency: AgencyBranding; expiresAt: string }

const GOALS = ['Grow followers', 'Generate leads', 'Drive sales', 'Build brand awareness', 'Retain customers'];
const TONES = ['Professional', 'Friendly & warm', 'Bold & confident', 'Educational', 'Minimal & luxury'];
const BUDGETS = ['Under ₹20,000/mo', '₹20,000–₹50,000/mo', '₹50,000–₹1L/mo', '₹1L–₹3L/mo', '₹3L+/mo'];

export default function OnboardingForm() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    businessName: '',
    website: '',
    industry: '',
    businessDescription: '',
    targetAudience: '',
    primaryLocation: '',
    instagramHandle: '',
    facebookHandle: '',
    linkedinHandle: '',
    youtubeHandle: '',
    twitterHandle: '',
    tiktokHandle: '',
    pinterestHandle: '',
    whatsappNumber: '',
    googleBusinessName: '',
    topGoals: [] as string[],
    currentChallenges: '',
    competitors: '',
    monthlyBudget: '',
    hasExistingContent: false,
    contentApprovalContact: '',
    brandColors: '',
    brandTone: '',
    wordsToAvoid: '',
  });

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleGoal = (g: string) => set('topGoals', form.topGoals.includes(g) ? form.topGoals.filter(x => x !== g) : [...form.topGoals, g]);

  useEffect(() => {
    api.get<{ data: TokenData }>(`/onboarding/${token}`)
      .then(r => { setTokenData(r.data); set('businessName', r.data.clientName); })
      .catch(e => setError(e?.message ?? 'Invalid or expired link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!form.businessName || !form.industry) { toast.error('Business name and industry are required'); return; }
    setSubmitting(true);
    try {
      await api.post(`/onboarding/${token}`, form);
      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = tokenData?.agency?.primaryColor ?? '#1a472a';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Link unavailable</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: primaryColor }} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Onboarding complete!</h2>
        <p className="text-gray-500 text-sm">Thank you, {tokenData?.clientName}. Your account manager will be in touch shortly.</p>
      </div>
    </div>
  );

  const STEPS = [
    { label: 'Business', num: 1 },
    { label: 'Social', num: 2 },
    { label: 'Goals', num: 3 },
    { label: 'Branding', num: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="py-6 px-4" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-xl mx-auto text-center text-white">
          {tokenData?.agency?.logoUrl && (
            <img src={tokenData.agency.logoUrl} alt={tokenData.agency.name} className="h-10 mx-auto mb-3 object-contain" />
          )}
          <p className="font-semibold text-lg">{tokenData?.agency?.name}</p>
          <p className="text-sm opacity-80 mt-1">Client Onboarding — {tokenData?.clientName}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${step >= s.num ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                style={step >= s.num ? { backgroundColor: primaryColor } : {}}>
                {step > s.num ? '✓' : s.num}
              </div>
              <div className={`flex-1 ml-2 text-xs font-medium ${step === s.num ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</div>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {step === 1 && (
            <>
              <h3 className="font-semibold text-gray-900 text-lg">Business information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business name <span className="text-red-400">*</span></label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="https://..." value={form.website} onChange={e => set('website', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry / niche <span className="text-red-400">*</span></label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="E.g. Restaurant, SaaS, Fashion" value={form.industry} onChange={e => set('industry', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business description</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" rows={3} placeholder="What do you do and who do you serve?" value={form.businessDescription} onChange={e => set('businessDescription', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target audience</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="E.g. Working professionals aged 25–40 in Pune" value={form.targetAudience} onChange={e => set('targetAudience', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary city/region</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="E.g. Pune, Maharashtra" value={form.primaryLocation} onChange={e => set('primaryLocation', e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-semibold text-gray-900 text-lg">Social media handles</h3>
              <p className="text-sm text-gray-500">Fill in only the platforms you're active on. You can skip any.</p>
              {[
                { label: 'Instagram', key: 'instagramHandle', prefix: '@' },
                { label: 'Facebook', key: 'facebookHandle', prefix: 'fb.com/' },
                { label: 'LinkedIn', key: 'linkedinHandle', prefix: 'linkedin.com/in/' },
                { label: 'YouTube', key: 'youtubeHandle', prefix: '@' },
                { label: 'Twitter / X', key: 'twitterHandle', prefix: '@' },
                { label: 'TikTok', key: 'tiktokHandle', prefix: '@' },
                { label: 'Pinterest', key: 'pinterestHandle', prefix: '@' },
                { label: 'WhatsApp Business', key: 'whatsappNumber', prefix: '+91 ' },
                { label: 'Google Business Name', key: 'googleBusinessName', prefix: '' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-300">
                    {f.prefix && <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-400 border-r border-gray-200">{f.prefix}</span>}
                    <input className="flex-1 px-3 py-2.5 text-sm focus:outline-none" value={(form as Record<string, unknown>)[f.key] as string} onChange={e => set(f.key, e.target.value)} />
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-semibold text-gray-900 text-lg">Goals & context</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Top goals (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map(g => (
                    <button key={g} type="button" onClick={() => toggleGoal(g)}
                      className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${form.topGoals.includes(g) ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                      style={form.topGoals.includes(g) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current marketing challenges</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" rows={3} placeholder="What's not working? What do you find most difficult?" value={form.currentChallenges} onChange={e => set('currentChallenges', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key competitors (names/handles)</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="Comma-separated: Brand A, Brand B" value={form.competitors} onChange={e => set('competitors', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly marketing budget (approx.)</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" value={form.monthlyBudget} onChange={e => set('monthlyBudget', e.target.value)}>
                  <option value="">Select range</option>
                  {BUDGETS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content approval contact (name & WhatsApp)</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="E.g. Priya Sharma, +91 98765..." value={form.contentApprovalContact} onChange={e => set('contentApprovalContact', e.target.value)} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="font-semibold text-gray-900 text-lg">Brand identity</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand tone / personality</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t} type="button" onClick={() => set('brandTone', form.brandTone === t ? '' : t)}
                      className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${form.brandTone === t ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                      style={form.brandTone === t ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand colours</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="E.g. #FF5733, Navy Blue, Gold" value={form.brandColors} onChange={e => set('brandColors', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Words or phrases to avoid</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" rows={2} placeholder="E.g. cheap, discount, basic, competitors' names..." value={form.wordsToAvoid} onChange={e => set('wordsToAvoid', e.target.value)} />
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.hasExistingContent} onChange={e => set('hasExistingContent', e.target.checked)} />
                  <span className="text-sm text-gray-700">We have existing brand assets (logo, photos, videos) ready to share</span>
                </label>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
              <ChevronLeft size={16} /> Back
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {submitting ? 'Submitting…' : 'Submit Onboarding'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
