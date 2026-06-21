import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, ArrowRight, LayoutDashboard, PenSquare, ClipboardList, Users } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

const STEPS = [
  {
    id: 'welcome',
    icon: Users,
    title: 'Welcome to the Team',
    body: 'This is your agency\'s Client OS — your central hub for managing clients, content, tasks, and growth. Everything you need is in one place.',
  },
  {
    id: 'content',
    icon: PenSquare,
    title: 'Content Studio',
    body: 'Head to Content Studio to create, schedule, and approve posts for clients. Posts go through Draft → Approval → Scheduled → Published. Your job is to move them forward.',
  },
  {
    id: 'clients',
    icon: LayoutDashboard,
    title: 'Client Workspace',
    body: 'Each client has their own workspace: platform scores, action items, messages, goals, and reports. Start by exploring the Clients section to see your assigned clients.',
  },
  {
    id: 'tasks',
    icon: ClipboardList,
    title: 'Action Items & Dashboard',
    body: 'The Dashboard shows everything due today — pending approvals, overdue tasks, and unread messages. Check it every morning. Use the + button (bottom right) to quickly create posts, action items, or invoices.',
  },
];

export default function TeamOnboardingModal() {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const { setUser, user } = useAuthStore();
  const qc = useQueryClient();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  async function complete() {
    setCompleting(true);
    try {
      await api.post('/auth/complete-onboarding', {});
      // Update local user state so modal doesn't re-show
      if (user) setUser({ ...user, teamOnboardingAt: new Date().toISOString() } as never);
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch {
      // Best effort — close anyway
      if (user) setUser({ ...user, teamOnboardingAt: new Date().toISOString() } as never);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary-700 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${i < step ? 'bg-green-100' : i === step ? 'bg-primary-100' : 'bg-gray-100'}`}>
                {i < step
                  ? <CheckCircle size={14} className="text-green-600" />
                  : <Circle size={14} className={i === step ? 'text-primary-700' : 'text-gray-300'} />
                }
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-auto">{step + 1} of {STEPS.length}</span>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
              <Icon size={28} className="text-primary-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
              <p className="text-gray-600 mt-2 text-sm leading-relaxed">{current.body}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary text-sm">Back</button>
            )}
            {isLast ? (
              <button
                onClick={complete}
                disabled={completing}
                className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              >
                {completing ? 'Saving…' : 'Get Started'}
                {!completing && <ArrowRight size={15} />}
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              >
                Next <ArrowRight size={15} />
              </button>
            )}
          </div>

          <button
            onClick={complete}
            className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
          >
            Skip onboarding
          </button>
        </div>
      </div>
    </div>
  );
}
