import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, BookOpen, Users, PenSquare, Bot, BarChart3, Zap, Settings, FileText, Bell, CheckCircle } from 'lucide-react';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  articles: Article[];
}

interface Article {
  title: string;
  role?: string;
  content: Step[];
}

interface Step {
  type: 'heading' | 'para' | 'steps' | 'note' | 'roles' | 'tip';
  text?: string;
  items?: string[];
  roles?: { name: string; color: string; desc: string }[];
}

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    icon: <BookOpen size={18} />,
    title: 'Getting Started',
    color: 'text-blue-600 bg-blue-50',
    articles: [
      {
        title: 'How to log in',
        content: [
          { type: 'steps', items: ['Go to nedsdrishti.in', 'Enter your email and password', 'Click Sign In — you\'ll land on your Dashboard'] },
          { type: 'note', text: 'If you forget your password, ask your Agency Owner to reset it from Settings → Team.' },
        ],
      },
      {
        title: 'Understanding your role',
        content: [
          { type: 'para', text: 'Every user has a role that controls what they can see and do. Your role is shown in the sidebar beneath your name.' },
          {
            type: 'roles',
            roles: [
              { name: 'Owner', color: 'bg-purple-100 text-purple-700', desc: 'Full access — billing, team management, settings, all clients.' },
              { name: 'Account Manager', color: 'bg-blue-100 text-blue-700', desc: 'Manage clients, content, audits, and reports. Cannot invite users or change settings.' },
              { name: 'Content Creator', color: 'bg-pink-100 text-pink-700', desc: 'Create and edit posts, use AI Studio, manage media. Cannot delete clients.' },
              { name: 'SEO Analyst', color: 'bg-green-100 text-green-700', desc: 'Run audits, fill platform checklists, view analytics. Read-only on content.' },
              { name: 'Auditor', color: 'bg-yellow-100 text-yellow-700', desc: 'View-only access to audits and client data. No editing.' },
              { name: 'Client', color: 'bg-gray-100 text-gray-700', desc: 'Sees their own portal only — posts pending approval, reports, branding.' },
            ],
          },
        ],
      },
      {
        title: 'Navigating the app',
        content: [
          { type: 'para', text: 'The sidebar on the left is your main navigation. Click the hamburger icon (☰) in the top-left to expand or collapse it.' },
          { type: 'steps', items: ['Dashboard — agency-wide stats at a glance', 'Clients — manage all client accounts', 'AI Studio — AI-powered content and audit tools', 'Content — compose, schedule, and manage posts', 'Analytics — reports and performance graphs', 'Optimize — platform-by-platform SEO checklists', 'Settings — branding, API keys, team (Owner only)'] },
          { type: 'tip', text: 'The bell icon in the top-right shows real-time notifications for post approvals and completed audits.' },
        ],
      },
    ],
  },
  {
    id: 'clients',
    icon: <Users size={18} />,
    title: 'Client Management',
    color: 'text-indigo-600 bg-indigo-50',
    articles: [
      {
        title: 'Adding a new client',
        role: 'Owner · Account Manager',
        content: [
          { type: 'steps', items: ['Go to Clients → click New Client (top-right)', 'Fill in: Business Name, Industry, Website URL, and Description', 'Add Social Handles (optional) — Instagram, Facebook, LinkedIn, etc.', 'Click Save Client'] },
          { type: 'note', text: 'The client starts as ACTIVE. You can change status to INACTIVE or PAUSED from the client detail page.' },
        ],
      },
      {
        title: 'Assigning team members to a client',
        role: 'Owner · Account Manager',
        content: [
          { type: 'steps', items: ['Open the client → click the detail card', 'Scroll to the Team section', 'Select a team member from the dropdown and click Assign', 'To remove someone, click the ✕ next to their name'] },
          { type: 'para', text: 'Only assigned team members can see and work on that client\'s content, audits, and optimizations.' },
        ],
      },
      {
        title: 'Client health scores',
        content: [
          { type: 'para', text: 'Each client card shows a coloured dot indicating their platform optimization health.' },
          { type: 'steps', items: ['Green (≥70%) — Profiles well optimized', 'Yellow (40–69%) — Some platforms need attention', 'Red (<40%) — Profiles need significant work'] },
          { type: 'tip', text: 'Click a client to see which specific platforms are pulling the score down, then go to Optimize to fix them.' },
        ],
      },
      {
        title: 'Sending a client invite',
        role: 'Owner',
        content: [
          { type: 'steps', items: ['Go to Settings → Team', 'Enter the client\'s email and select role: Client', 'Click Invite — they receive an email with a login link'] },
          { type: 'para', text: 'Client users see only their own portal: posts waiting for approval, published content, and their PDF reports.' },
        ],
      },
    ],
  },
  {
    id: 'content',
    icon: <PenSquare size={18} />,
    title: 'Content Studio',
    color: 'text-pink-600 bg-pink-50',
    articles: [
      {
        title: 'Creating a new post',
        content: [
          { type: 'steps', items: ['Go to Content → click New Post', 'Select the Client from the dropdown', 'Choose one or more Platforms (LinkedIn, Instagram, etc.)', 'Write your Caption in the text area', 'Add Hashtags — type and press Enter or comma to add each one', 'Optionally set a Scheduled Date & Time', 'Click Save as Draft or Save & Schedule'] },
          { type: 'tip', text: 'Use the "Generate Caption" button to have AI write a platform-optimised caption based on the client\'s niche.' },
        ],
      },
      {
        title: 'Using Post Templates',
        content: [
          { type: 'steps', items: ['In the composer, click the Templates button above the caption field', 'Select a saved template to load its caption and hashtags', 'Edit as needed, then save or schedule the post'] },
          { type: 'heading', text: 'Saving a new template' },
          { type: 'steps', items: ['Write your caption in the composer', 'Click "Save as Template" next to the Templates button', 'Enter a template name and click Save'] },
        ],
      },
      {
        title: 'Loading hashtag sets',
        content: [
          { type: 'steps', items: ['In the composer, click "Load from saved sets" below the hashtag field', 'Click any saved set — its hashtags are added to the post', 'You can load multiple sets and edit freely'] },
          { type: 'heading', text: 'Creating a hashtag set' },
          { type: 'steps', items: ['Go to Content → a post composer with a client selected', 'Click "Load from saved sets" → "Manage sets" (or create from Settings)', 'Or: go to the Hashtags API directly — sets are per-client and per-platform'] },
        ],
      },
      {
        title: 'Attaching media to a post',
        content: [
          { type: 'steps', items: ['In the composer, scroll to the Media section', 'Click "Add from Library" to open the Media Picker', 'Select one or more images/videos — they highlight with a checkmark', 'Click "Add to Post (N)" to attach them', 'To remove an attached file, click the ✕ on its thumbnail'] },
          { type: 'note', text: 'You must select a Client before attaching media — the library is per-client.' },
        ],
      },
      {
        title: 'Post approval workflow',
        content: [
          { type: 'para', text: 'Every post has an approval status: Pending → Approved or Rejected.' },
          { type: 'steps', items: ['Content Creator saves a draft (status: Pending)', 'Account Manager or Owner opens the post and clicks Approve or Reject with feedback', 'On approval, the creator gets a notification (bell icon)', 'Approved posts can be scheduled; rejected posts go back to the creator for revision'] },
          { type: 'tip', text: 'Client users see approved posts in their portal and can leave comments.' },
        ],
      },
      {
        title: 'Content Calendar',
        content: [
          { type: 'steps', items: ['Go to Content → Calendar', 'The calendar shows all scheduled posts by date', 'Click any date with a dot to see that day\'s posts', 'Click a post to open the editor'] },
        ],
      },
      {
        title: 'Ideas Engine',
        content: [
          { type: 'steps', items: ['Go to Content → Ideas', 'Select a client and enter a topic or keyword', 'Click Generate — AI produces a set of post ideas', 'Click Save on any idea to keep it; click Use to load it into the composer'] },
        ],
      },
      {
        title: 'Media Library',
        content: [
          { type: 'steps', items: ['Go to Content → Media', 'Select a client from the dropdown', 'Click Upload Files to add images or videos (max 20 MB each)', 'Images are auto-converted to WebP and resized to max 1920px', 'Click the red trash icon on any asset to delete it'] },
          { type: 'note', text: 'Media is stored per-client. You must select a client before uploading.' },
        ],
      },
    ],
  },
  {
    id: 'ai-studio',
    icon: <Bot size={18} />,
    title: 'AI Studio',
    color: 'text-violet-600 bg-violet-50',
    articles: [
      {
        title: 'What is AI Studio?',
        content: [
          { type: 'para', text: 'AI Studio is a collection of Claude-powered tools for generating content, auditing profiles, and producing reports. Each tool is purpose-built for a specific agency task.' },
          { type: 'tip', text: 'AI Studio tracks token usage per tool. Owners can view spend on the AI Usage page.' },
        ],
      },
      {
        title: 'Caption Generator',
        content: [
          { type: 'steps', items: ['Go to AI Studio → Caption Generator', 'Select client, platform, and tone', 'Enter a brief topic or key message', 'Click Generate — get 3 caption variations', 'Click Use on any caption to load it directly into the Content Composer'] },
        ],
      },
      {
        title: 'Hashtag Research',
        content: [
          { type: 'steps', items: ['Select a client and enter a niche keyword', 'Click Generate — AI returns a ranked hashtag list with volume estimates', 'Click Copy All or copy individual hashtags', 'Click Save as Set to store them for future posts'] },
        ],
      },
      {
        title: 'Profile Bio Writer',
        content: [
          { type: 'steps', items: ['Select client and target platform', 'Enter key services, tone, and USPs', 'Click Generate — receive a character-count-optimised bio', 'Copy and paste into the platform profile'] },
        ],
      },
      {
        title: 'Audit Report Writer',
        content: [
          { type: 'steps', items: ['Select a client and choose a completed audit', 'Click Generate Report — AI writes a full narrative audit report', 'Review and edit inline', 'Click Download PDF to produce a client-ready PDF'] },
        ],
      },
      {
        title: 'Viewing AI usage',
        role: 'Owner',
        content: [
          { type: 'steps', items: ['Go to AI Studio → Usage (top-right link)', 'See total tokens used, cost estimate, and breakdown by tool', 'Filter by date range or team member'] },
        ],
      },
    ],
  },
  {
    id: 'audit',
    icon: <CheckCircle size={18} />,
    title: 'Audit Module',
    color: 'text-green-600 bg-green-50',
    articles: [
      {
        title: 'Running a new audit',
        role: 'Owner · Account Manager · SEO Analyst',
        content: [
          { type: 'steps', items: ['Go to Clients → open a client', 'Click New Audit in the Audits section', 'Select the audit type (Social Media, GMB, Website, etc.)', 'The system generates a checklist of items to review', 'Work through each check — mark Pass, Fail, or N/A', 'Add notes to any item for client-facing context'] },
        ],
      },
      {
        title: 'Completing and sharing an audit',
        content: [
          { type: 'steps', items: ['Once all items are reviewed, click Mark Complete', 'The audit locks and a notification is sent to assigned team members', 'Go to AI Studio → Audit Report Writer to generate a PDF narrative', 'Download the PDF and share with the client'] },
          { type: 'note', text: 'Completed audits cannot be edited. Create a new audit if you need to re-check.' },
        ],
      },
    ],
  },
  {
    id: 'optimize',
    icon: <Zap size={18} />,
    title: 'Optimize',
    color: 'text-yellow-600 bg-yellow-50',
    articles: [
      {
        title: 'Platform optimization checklists',
        content: [
          { type: 'para', text: 'Optimize tracks how well each client\'s social profiles are set up — bio, cover image, contact info, posting frequency, and more.' },
          { type: 'steps', items: ['Go to Optimize', 'Select a client — see all their platforms and a progress bar for each', 'Click a platform to open its checklist', 'Check off each completed item — progress saves automatically', 'The client health score on the Clients page updates in real time'] },
        ],
      },
      {
        title: 'Reading the score',
        content: [
          { type: 'steps', items: ['Each checklist item is weighted equally', 'Score = checked items ÷ total items × 100', 'Green ≥70%, Yellow 40–69%, Red <40%', 'Aim for 100% on primary platforms before moving to secondary ones'] },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    icon: <BarChart3 size={18} />,
    title: 'Analytics',
    color: 'text-orange-600 bg-orange-50',
    articles: [
      {
        title: 'Agency analytics overview',
        content: [
          { type: 'steps', items: ['Go to Analytics', 'The overview shows: total clients, active posts, audits completed, and team activity', 'Use the date range picker to filter by period', 'Scroll down for per-client performance breakdowns'] },
        ],
      },
      {
        title: 'Downloading client reports',
        content: [
          { type: 'steps', items: ['Go to Analytics → select a client', 'Click Download PDF Report — generates a branded PDF with all stats', 'The report uses your agency\'s branding (logo, colours) from Settings'] },
          { type: 'tip', text: 'Set up your agency branding in Settings → Branding before sending any reports to clients.' },
        ],
      },
    ],
  },
  {
    id: 'settings',
    icon: <Settings size={18} />,
    title: 'Settings',
    color: 'text-gray-600 bg-gray-100',
    articles: [
      {
        title: 'Agency branding',
        role: 'Owner',
        content: [
          { type: 'steps', items: ['Go to Settings → Branding', 'Upload your agency logo (PNG or SVG, max 2 MB)', 'Set primary and secondary brand colours using the colour pickers', 'Click Save Branding — all PDF reports will use these colours and logo'] },
        ],
      },
      {
        title: 'Connecting API keys',
        role: 'Owner',
        content: [
          { type: 'steps', items: ['Go to Settings → API Keys', 'Enter keys for: Google Analytics, Google Search Console, Meta Business, etc.', 'Keys are stored AES-256 encrypted — nobody can read them back', 'Click Save Keys'] },
          { type: 'note', text: 'Never share API keys over Slack or email. Use this Settings page only.' },
        ],
      },
      {
        title: 'Inviting team members',
        role: 'Owner',
        content: [
          { type: 'steps', items: ['Go to Settings → Team', 'Enter the email address and select the role', 'Click Invite — the user receives an email with a one-time login link', 'They set their password on first login'] },
        ],
      },
      {
        title: 'Changing a team member\'s role',
        role: 'Owner',
        content: [
          { type: 'steps', items: ['Go to Settings → Team', 'Find the team member in the list', 'Select a new role from the dropdown next to their name', 'Change takes effect immediately on their next page load'] },
        ],
      },
    ],
  },
  {
    id: 'notifications',
    icon: <Bell size={18} />,
    title: 'Notifications',
    color: 'text-red-600 bg-red-50',
    articles: [
      {
        title: 'Understanding notifications',
        content: [
          { type: 'para', text: 'The bell icon in the top-right header shows your unread notification count. Notifications are generated automatically for key events.' },
          { type: 'steps', items: ['Post Approved — your post was approved by a manager', 'Post Rejected — your post was sent back for revision', 'Audit Completed — an audit you\'re assigned to was completed'] },
        ],
      },
      {
        title: 'Marking notifications as read',
        content: [
          { type: 'steps', items: ['Click the bell icon to open the notification panel', 'Click any notification to navigate to the related item (it marks as read)', 'Click "Mark all read" at the top of the panel to clear all at once'] },
          { type: 'note', text: 'Notifications refresh every 30 seconds automatically.' },
        ],
      },
    ],
  },
];

function RoleBadge({ text }: { text: string }) {
  return (
    <span className="inline-block text-[10px] font-semibold bg-primary-50 text-primary-700 border border-primary-100 rounded-full px-2 py-0.5">
      {text}
    </span>
  );
}

function ArticleContent({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-3 text-sm text-gray-700">
      {steps.map((step, i) => {
        if (step.type === 'heading') {
          return <p key={i} className="font-semibold text-gray-800 mt-2">{step.text}</p>;
        }
        if (step.type === 'para') {
          return <p key={i} className="text-gray-600 leading-relaxed">{step.text}</p>;
        }
        if (step.type === 'steps' && step.items) {
          return (
            <ol key={i} className="space-y-1.5 pl-1">
              {step.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                  <span className="text-gray-700 leading-snug">{item}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (step.type === 'note') {
          return (
            <div key={i} className="flex gap-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2.5">
              <span className="text-yellow-500 text-xs font-bold mt-0.5 flex-shrink-0">NOTE</span>
              <p className="text-yellow-800 text-xs leading-relaxed">{step.text}</p>
            </div>
          );
        }
        if (step.type === 'tip') {
          return (
            <div key={i} className="flex gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <span className="text-blue-500 text-xs font-bold mt-0.5 flex-shrink-0">TIP</span>
              <p className="text-blue-800 text-xs leading-relaxed">{step.text}</p>
            </div>
          );
        }
        if (step.type === 'roles' && step.roles) {
          return (
            <div key={i} className="space-y-2">
              {step.roles.map((r, j) => (
                <div key={j} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${r.color}`}>{r.name}</span>
                  <p className="text-xs text-gray-600 leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function Help() {
  const [search, setSearch] = useState('');
  const [openSection, setOpenSection] = useState<string | null>('getting-started');
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  const q = search.toLowerCase().trim();

  const filtered = SECTIONS.map(section => ({
    ...section,
    articles: section.articles.filter(a => {
      if (!q) return true;
      if (a.title.toLowerCase().includes(q)) return true;
      return a.content.some(step => {
        if (step.text?.toLowerCase().includes(q)) return true;
        if (step.items?.some(i => i.toLowerCase().includes(q))) return true;
        if (step.roles?.some(r => r.desc.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))) return true;
        return false;
      });
    }),
  })).filter(s => s.articles.length > 0);

  const totalArticles = SECTIONS.reduce((sum, s) => sum + s.articles.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Guide</h1>
          <p className="text-gray-500 mt-1 text-sm">{totalArticles} articles across {SECTIONS.length} modules</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); if (e.target.value) setOpenSection(null); }}
          placeholder="Search guides… (e.g. &quot;upload media&quot;, &quot;approve post&quot;, &quot;invite team&quot;)"
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            Clear
          </button>
        )}
      </div>

      {/* Quick links (only when not searching) */}
      {!q && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setOpenSection(s.id); setOpenArticle(null); }}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all hover:shadow-sm ${openSection === s.id ? 'border-primary-200 bg-primary-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <span className={`p-1.5 rounded-lg ${s.color}`}>{s.icon}</span>
              <span className="text-sm font-medium text-gray-700">{s.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {q && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-500">No results for "{search}"</p>
          <p className="text-sm mt-1">Try different keywords or browse sections above</p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {(q ? filtered : filtered.filter(s => !openSection || s.id === openSection)).map(section => (
          <div key={section.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Section header */}
            <button
              onClick={() => { setOpenSection(openSection === section.id ? null : section.id); setOpenArticle(null); }}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <span className={`p-2 rounded-lg ${section.color}`}>{section.icon}</span>
              <span className="font-semibold text-gray-800 flex-1">{section.title}</span>
              <span className="text-xs text-gray-400 mr-2">{section.articles.length} articles</span>
              {openSection === section.id
                ? <ChevronDown size={16} className="text-gray-400" />
                : <ChevronRight size={16} className="text-gray-400" />}
            </button>

            {/* Articles */}
            {(openSection === section.id || !!q) && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {section.articles.map(article => {
                  const key = `${section.id}::${article.title}`;
                  const isOpen = openArticle === key;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setOpenArticle(isOpen ? null : key)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <FileText size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 font-medium flex-1">{article.title}</span>
                        {article.role && (
                          <span className="hidden sm:flex gap-1 flex-wrap justify-end">
                            {article.role.split(' · ').map(r => <RoleBadge key={r} text={r} />)}
                          </span>
                        )}
                        {isOpen
                          ? <ChevronDown size={14} className="text-gray-300 flex-shrink-0 ml-2" />
                          : <ChevronRight size={14} className="text-gray-300 flex-shrink-0 ml-2" />}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 pt-1">
                          {article.role && (
                            <div className="flex gap-1 flex-wrap mb-3">
                              {article.role.split(' · ').map(r => <RoleBadge key={r} text={r} />)}
                            </div>
                          )}
                          <ArticleContent steps={article.content} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Show all sections button when one is filtered */}
        {!q && openSection && (
          <button
            onClick={() => setOpenSection(null)}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-primary-600 transition-colors text-center"
          >
            Show all sections
          </button>
        )}
      </div>
    </div>
  );
}
