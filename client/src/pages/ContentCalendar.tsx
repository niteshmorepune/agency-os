import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ArrowLeft, PenSquare } from 'lucide-react';
import { api } from '../api/client';

interface PostDraft {
  id: string;
  clientId: string;
  platforms: string[];
  caption: string;
  scheduledAt: string | null;
  status: string;
  approvalStatus: string;
}

const PLATFORM_BG: Record<string, string> = {
  LINKEDIN:   'bg-blue-600',
  INSTAGRAM:  'bg-pink-500',
  FACEBOOK:   'bg-blue-500',
  GBP:        'bg-green-600',
  YOUTUBE:    'bg-red-600',
  TWITTER:    'bg-sky-500',
  TIKTOK:     'bg-gray-800',
  PINTEREST:  'bg-red-500',
  GOOGLE_ADS: 'bg-yellow-500',
  EMAIL:      'bg-purple-600',
  WHATSAPP:   'bg-green-500',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function ContentCalendar() {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();

  const { data } = useQuery({
    queryKey: ['posts-calendar', year, month],
    queryFn: () => api.get<{ data: PostDraft[] }>('/posts?limit=200'),
    staleTime: 30_000,
  });

  const allPosts = data?.data ?? [];
  const scheduledPosts = allPosts.filter(p => p.scheduledAt && p.status !== 'ARCHIVED');

  // Posts indexed by day of month
  const byDay: Record<number, PostDraft[]> = {};
  for (const post of scheduledPosts) {
    if (!post.scheduledAt) continue;
    const d = new Date(post.scheduledAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    byDay[day] ??= [];
    byDay[day].push(post);
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const totalScheduled = Object.values(byDay).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/content" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
            <Link to="/content" className="hover:text-primary-600">Content Studio</Link>
            <span>/</span>
            <span>Calendar</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Content Calendar</h1>
            {totalScheduled > 0 && (
              <span className="text-sm text-gray-400">{totalScheduled} post{totalScheduled !== 1 ? 's' : ''} scheduled</span>
            )}
          </div>
        </div>
        <Link to="/content/new" className="btn-primary text-sm flex items-center gap-2 flex-shrink-0">
          <PenSquare size={15} /> New Post
        </Link>
      </div>

      <div className="card overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-semibold text-gray-900">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={next} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayPosts = day !== null ? (byDay[day] ?? []) : [];
            return (
              <div
                key={idx}
                className={`min-h-[80px] p-2 border-b border-r border-gray-50 ${!day ? 'bg-gray-50/50' : 'hover:bg-gray-50/70'} transition-colors`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-primary-800 text-white' : 'text-gray-500'
                    }`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => (
                        <Link
                          key={post.id}
                          to={`/content/${post.id}/edit`}
                          className="block"
                        >
                          <div className={`flex items-center gap-1 text-xs rounded px-1.5 py-0.5 text-white truncate ${
                            PLATFORM_BG[post.platforms[0]] ?? 'bg-primary-600'
                          }`}>
                            <span className="truncate">{post.caption.slice(0, 20)}{post.caption.length > 20 ? '…' : ''}</span>
                          </div>
                        </Link>
                      ))}
                      {dayPosts.length > 3 && (
                        <p className="text-xs text-gray-400 pl-1">+{dayPosts.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
        <span className="font-medium">Platform colors:</span>
        {Object.entries(PLATFORM_BG).slice(0, 6).map(([key, bg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}
