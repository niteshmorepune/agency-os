import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, BookOpen, Users, PenSquare, Bot, BarChart3, Zap, Settings, FileText, Bell, CheckCircle, Receipt, Activity, User, Download, RefreshCw, Globe } from 'lucide-react';

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
          { type: 'tip', text: 'Use the eye icon next to the password field to show or hide what you are typing.' },
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
              { name: 'Client', color: 'bg-gray-100 text-gray-700', desc: 'Sees their own portal only — action items, messages, posts, platform scores, and PDF reports.' },
            ],
          },
        ],
      },
      {
        title: 'Navigating the app',
        content: [
          { type: 'para', text: 'The sidebar on the left is your main navigation. Click the hamburger icon (☰) in the top-left to expand or collapse it.' },
          { type: 'steps', items: ['Dashboard — agency-wide stats at a glance', 'Clients — manage all client accounts', 'AI Studio — 10 AI-powered tools for content, research, and audits', 'Content — compose, schedule, and manage posts', 'Analytics — reports, performance graphs, and AI digest', 'Optimize — platform-by-platform SEO checklists with AI rewrite', 'Invoices — create and manage client invoices (Owner · Account Manager)', 'Activity — full audit trail of team actions (Owner only)', 'Settings — branding, API keys, team, webhooks (Owner only)', 'Help & Guide — this page'] },
          { type: 'tip', text: 'Click your name at the bottom of the sidebar at any time to open your Profile page and update your details or password.' },
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
          { type: 'steps', items: ['Open the client → click the Team tab', 'Select a team member from the dropdown and click Assign', 'To remove someone, click the trash icon next to their name'] },
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
          { type: 'para', text: 'Client users see only their own portal: action items, messages, posts waiting for approval, platform scores, and PDF reports.' },
        ],
      },
      {
        title: 'Client onboarding questionnaire',
        role: 'Owner · Account Manager',
        content: [
          { type: 'para', text: 'Send a branded, public questionnaire link to a new client so they can fill in their business details, goals, social handles, and brand voice — no login required.' },
          { type: 'steps', items: ['Open the client → go to the Reports tab', 'Click "Send Onboarding Link" — the system generates a unique token and emails a branded form link to the client\'s contact email', 'The client opens the link and completes 4 steps: Business basics, Social handles, Goals & context, Brand identity', 'On submission their data is saved to the client record and a \'Thank you\' screen is shown', 'Onboarding data (goals, brand tone, words to avoid, etc.) becomes available to AI tools automatically'] },
          { type: 'note', text: 'The link expires after 7 days. Resend it from the same Reports tab to generate a fresh token.' },
          { type: 'tip', text: 'After the client submits the form, check the client\'s Overview tab — the brand tone, words to avoid, and primary location fields are pre-populated.' },
        ],
      },
      {
        title: 'Action Items — assigning tasks to clients',
        role: 'Owner · Account Manager',
        content: [
          { type: 'para', text: 'Action Items are tasks or deliverables you assign to a client. They appear both in the client\'s portal and in your agency view.' },
          { type: 'steps', items: ['Open the client → click the Action Items tab', 'Click "New Action Item" — enter a title, optional description, and optional due date', 'Click Create — the client receives an email notification and can see the item in their portal', 'Change status: click Start (moves to In Progress) or Done (marks as Completed)', 'Delete an item with the trash icon (items are permanently removed)'] },
          { type: 'heading', text: 'Status flow' },
          { type: 'steps', items: ['PENDING — just created, not started', 'IN PROGRESS — your team has started', 'COMPLETED — done and marked complete', 'CANCELLED — no longer relevant'] },
          { type: 'note', text: 'Overdue items (past their due date) are highlighted with a red left border so they are easy to spot.' },
        ],
      },
      {
        title: 'Messaging clients in-app',
        content: [
          { type: 'para', text: 'Send and receive messages with a client directly inside the platform. Both agency team members and the client can initiate the conversation.' },
          { type: 'steps', items: ['Agency side: Open the client → click the Messages tab', 'Type a message in the text box at the bottom and click Send (or press Enter)', 'The message thread refreshes every 30 seconds automatically', 'The client receives an email notification when a new message arrives', 'Client side: open their portal → scroll to the Messages section at the bottom'] },
          { type: 'tip', text: 'Use Shift+Enter to add a line break without sending the message.' },
          { type: 'note', text: 'Messages are sent per-client — they are not a shared team chat. Only agency members assigned to the client and the client themselves can see the thread.' },
        ],
      },
      {
        title: 'Deleting a client',
        role: 'Owner',
        content: [
          { type: 'para', text: 'Deleting a client permanently removes the client record and all associated data — posts, audits, platform scores, invoices, messages, action items, and media.' },
          { type: 'steps', items: ['Open the client → click the red trash icon in the top-right header', 'A confirmation dialog appears showing the client name', 'Click "Yes, delete" to permanently delete', 'You are redirected to the Clients list automatically'] },
          { type: 'note', text: 'This cannot be undone. All associated data is deleted permanently. Only the Owner role has access to the delete button.' },
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
        title: 'Post approval and publish workflow',
        content: [
          { type: 'para', text: 'Every post moves through: Draft → Pending → Approved → Published.' },
          { type: 'steps', items: ['Content Creator saves a draft (approval status: Pending)', 'Account Manager or Owner reviews the post and clicks Approve or Reject', 'On approval, the creator gets a bell notification', 'Rejected posts return to the creator for revision', 'Once approved, Owner or Account Manager clicks Publish to mark the post as Published', 'Publishing fires any webhooks configured for the post.published event'] },
          { type: 'note', text: 'A post must be Approved before it can be Published. You cannot publish a Pending or Rejected post.' },
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
          { type: 'para', text: 'AI Studio is a collection of 10 Claude-powered tools for generating content, researching audiences, auditing profiles, and producing reports. Each tool is purpose-built for a specific agency task.' },
          { type: 'steps', items: ['Caption Generator — write platform-optimised captions in seconds', 'Hashtag Research — ranked hashtags with volume estimates', 'Profile Bio Writer — character-count-aware bios for any platform', 'Audit Report Writer — full narrative audit reports from checklist results', 'Content Repurposer — transform one piece of content into 5 platform formats', 'Audience Persona Builder — detailed audience persona with psychographics and messaging', 'Competitor Analyzer — side-by-side profile gap analysis vs. a competitor URL', 'Posting Time Optimizer — evidence-based optimal posting schedule grid by platform and location', 'Engagement Rate Analyzer — calculate, benchmark, and get AI recommendations to improve engagement', 'Viewing AI usage — track token spend per tool'] },
          { type: 'tip', text: 'AI Studio tracks token usage per tool. Owners can view total spend on the AI Usage page (top-right link in AI Studio).' },
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
        title: 'Content Repurposer',
        content: [
          { type: 'para', text: 'Turn one piece of content (blog post, long caption, video script) into 5 platform-optimised formats at once.' },
          { type: 'steps', items: ['Go to AI Studio → Content Repurposer', 'Select a client (optional — adds brand context)', 'Paste your original content into the input box', 'Select target platforms (e.g. LinkedIn, Instagram, Twitter/X, Facebook, Email)', 'Click Repurpose — AI rewrites the content natively for each platform', 'Copy each version individually or use them to populate the Content Composer'] },
          { type: 'tip', text: 'The repurposer honours the client\'s brand tone and words-to-avoid if the onboarding questionnaire has been completed.' },
        ],
      },
      {
        title: 'Audience Persona Builder',
        content: [
          { type: 'para', text: 'Generate a detailed ideal customer persona complete with demographics, psychographics, pain points, content triggers, and a messaging guide.' },
          { type: 'steps', items: ['Go to AI Studio → Audience Persona Builder', 'Select a client', 'Enter product or service description, industry, and any notes about the audience', 'Click Build Persona — AI creates a full persona document', 'The persona is saved to the client\'s record and available for future AI tool runs'] },
        ],
      },
      {
        title: 'Competitor Analyzer',
        content: [
          { type: 'para', text: 'Analyse a competitor\'s social profile and get a side-by-side gap analysis with actionable improvement recommendations.' },
          { type: 'steps', items: ['Go to AI Studio → Competitor Analyzer', 'Select the client whose profile you want to compare', 'Enter the competitor\'s profile URL and platform', 'Click Analyze — AI audits key profile elements and identifies gaps', 'Receive a scored comparison with specific recommendations on what to fix'] },
          { type: 'note', text: 'The analyzer uses publicly available profile information. Accuracy depends on what the competitor has made public.' },
        ],
      },
      {
        title: 'Posting Time Optimizer',
        content: [
          { type: 'para', text: 'Get an evidence-based weekly posting schedule grid for multiple platforms at once, tailored by audience location.' },
          { type: 'steps', items: ['Go to AI Studio → Posting Time Optimizer', 'Select one or more platforms (LinkedIn, Instagram, Facebook, Twitter, YouTube, TikTok, Pinterest, WhatsApp, Email, Google Ads)', 'Choose audience location (India, Global, US, UK, UAE, Australia)', 'Set posts per week per platform', 'Optionally enter industry for AI custom advice', 'Click Generate Schedule — a colour-coded 7-day × 14-hour grid appears for each platform', 'Green = Optimal, Yellow = Acceptable, Grey = Avoid', 'After generating, click "Get AI Custom Advice" for industry-specific tips', 'Click CSV to export the recommended time slots'] },
          { type: 'tip', text: 'Select the client from the dropdown to attach the schedule to their record for future reference.' },
        ],
      },
      {
        title: 'Engagement Rate Analyzer',
        content: [
          { type: 'para', text: 'Calculate an account\'s engagement rate, benchmark it against industry standards, and receive AI-powered recommendations to improve it.' },
          { type: 'steps', items: ['Go to AI Studio → Engagement Rate Analyzer', 'Select a platform (Instagram, LinkedIn, Facebook, Twitter, TikTok, YouTube, Pinterest)', 'Enter followers, average likes per post (required), and optionally: average comments, shares/saves, and average reach', 'Add industry (e.g. Fashion, SaaS, Restaurant) for more accurate benchmarks', 'Click Analyze Engagement', 'See your engagement rate % with a rating (Excellent / Good / Average / Below Average / Poor)', 'View benchmarks: Poor / Average / Good thresholds for that platform', 'See your percentile — "Better than X% of accounts in your industry"', 'AI recommendations appear as cards with Impact and Effort ratings'] },
          { type: 'tip', text: 'Results are cached — re-running with the same inputs instantly returns the previous result. Change any input to force a fresh analysis.' },
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
      {
        title: 'AI Profile Rewrite — get 3 AI variants',
        content: [
          { type: 'para', text: 'For any checklist item that contains written copy (bio, headline, about section, ad copy, etc.), you can request 3 AI-written variants and apply the best one.' },
          { type: 'steps', items: ['Open a platform checklist (e.g. LinkedIn, Instagram, Google Business Profile)', 'Find a text-based check (e.g. "LinkedIn Headline", "Instagram Bio", "GBP Description")', 'Click the "AI Rewrite" button next to that check', 'A slide-in panel opens showing 3 AI-generated variants, each within the platform\'s character limit', 'Click "Use This" on any variant to copy it, ready to paste into the profile', 'Optionally click "Regenerate" to get 3 fresh variants'] },
          { type: 'tip', text: 'AI rewrites use the client\'s brand name, industry, and onboarding data automatically. Complete the onboarding questionnaire first for the best results.' },
          { type: 'note', text: 'AI Rewrite is available for: LinkedIn Headline, LinkedIn About, Instagram Bio, Google Business Profile Description and Review Responses, YouTube About and Titles, Twitter/X Bio, TikTok Bio, Google Ads Copy, Email Subject Lines, and WhatsApp Auto-Reply.' },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    icon: <BarChart3 size={18} />,
    title: 'Analytics & Reports',
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
      {
        title: 'Sending a client report by email',
        role: 'Owner · Account Manager',
        content: [
          { type: 'steps', items: ['Open a Client → go to the Reports tab', 'Click "Send Report Now" — the system generates a PDF and emails it to the client\'s registered email', 'A confirmation toast appears once sent'] },
          { type: 'note', text: 'SMTP must be configured in Settings → API Keys before email sending works.' },
        ],
      },
      {
        title: 'Scheduling automated monthly reports',
        role: 'Owner · Account Manager',
        content: [
          { type: 'steps', items: ['Open a Client → go to the Reports tab', 'In the Schedule dropdown, select Monthly', 'Click Save Schedule — the system will auto-email the PDF report on the 1st of each month', 'To stop, set the schedule back to None'] },
          { type: 'tip', text: 'The "Last sent" date shows when the report was most recently emailed, so you can confirm delivery.' },
        ],
      },
      {
        title: 'AI Weekly Digest',
        role: 'Owner',
        content: [
          { type: 'para', text: 'The AI Weekly Digest gives you an instant AI-written summary of your agency\'s activity — clients, posts, audits, invoices, and top scores.' },
          { type: 'steps', items: ['Go to Analytics → scroll to the "AI Weekly Digest" card', 'Click "Generate Digest" — Claude analyses all agency data and writes a narrative summary', 'Read the digest in-app, or click "Email Digest" to send it to the Owner\'s registered email'] },
          { type: 'note', text: 'Generating a digest consumes AI tokens. It is not rate-limited, but use it thoughtfully.' },
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
          { type: 'steps', items: ['Go to Settings → API Keys', 'Enter keys for: Anthropic (required for all AI), SMTP email, Google PSI, Ahrefs, DataForSEO', 'Keys are stored AES-256 encrypted — nobody can read them back', 'Click Save Keys'] },
          { type: 'tip', text: 'From the Dashboard, the Setup Reminder "Go to Settings →" link opens directly on the API Keys tab for quick first-time setup.' },
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
      {
        title: 'Setting up webhooks',
        role: 'Owner',
        content: [
          { type: 'para', text: 'Webhooks let you send real-time HTTP notifications to external tools (Zapier, Slack, your own systems) when events happen in the app.' },
          { type: 'steps', items: ['Go to Settings → Webhooks', 'Click Add Webhook', 'Enter a name (e.g. "Slack notifications") and the endpoint URL', 'Tick the events you want to subscribe to (post.approved, invoice.paid, etc.)', 'Click Create — a signing secret is generated automatically'] },
          { type: 'heading', text: 'Available events' },
          { type: 'steps', items: ['post.approved — a post was approved by a manager', 'post.rejected — a post was sent back for revision', 'post.published — a post was marked as published', 'invoice.sent — an invoice was sent to the client', 'invoice.paid — an invoice was marked as paid', 'audit.completed — an audit was completed'] },
        ],
      },
      {
        title: 'Verifying webhook signatures',
        role: 'Owner',
        content: [
          { type: 'para', text: 'Every webhook request is signed so your endpoint can confirm it came from this app.' },
          { type: 'steps', items: ['Each request includes the header: X-Agency-Signature: sha256=<hex>', 'Also included: X-Agency-Timestamp and X-Agency-Event', 'Compute: HMAC-SHA256(secret, "<timestamp>.<body>") and compare with the header value', 'Reject any request where the signatures do not match'] },
          { type: 'tip', text: 'Use the Rotate Secret button on a webhook to generate a new secret if you suspect a key has been leaked. Update your endpoint before rotating.' },
        ],
      },
    ],
  },
  {
    id: 'invoices',
    icon: <Receipt size={18} />,
    title: 'Invoices',
    color: 'text-emerald-600 bg-emerald-50',
    articles: [
      {
        title: 'Creating an invoice',
        role: 'Owner · Account Manager',
        content: [
          { type: 'steps', items: ['Go to Invoices → click New Invoice', 'Select the client from the dropdown', 'Add line items: enter a description, quantity, and rate — the amount calculates automatically', 'Set an Issue Date and Due Date', 'Add Tax % if applicable', 'Click Save Invoice — it is saved as Draft with an auto-generated invoice number (INV-YYYY-NNN)'] },
          { type: 'tip', text: 'Add any internal notes in the Notes field — they appear on the PDF but are clearly marked as internal.' },
        ],
      },
      {
        title: 'Invoice status workflow',
        role: 'Owner · Account Manager',
        content: [
          { type: 'para', text: 'Invoices move through four statuses: Draft → Sent → Paid (or Overdue).' },
          { type: 'steps', items: ['Draft — invoice is created but not shared with the client yet', 'Mark Sent — click "Mark as Sent" to record that the invoice has been shared; fires the invoice.sent webhook', 'Mark Paid — click "Mark as Paid" once payment is received; fires invoice.paid webhook', 'Mark Overdue — click "Mark as Overdue" if the due date passes without payment'] },
          { type: 'note', text: 'Only Draft invoices can be deleted. Sent, Paid, and Overdue invoices are permanent records.' },
        ],
      },
      {
        title: 'Downloading an invoice PDF',
        role: 'Owner · Account Manager',
        content: [
          { type: 'steps', items: ['Open any invoice', 'Click "Download PDF" in the top-right corner', 'A branded PDF is generated with your agency logo, colours, line items, and totals', 'The PDF opens in a new tab or downloads directly depending on your browser'] },
          { type: 'tip', text: 'Make sure your agency branding (name, logo, primary colour) is set in Settings → Branding so the PDF looks professional.' },
        ],
      },
      {
        title: 'Tracking outstanding payments',
        content: [
          { type: 'steps', items: ['Go to the Invoices list page', 'The summary cards at the top show: Total Collected, Outstanding, and Overdue amounts', 'Use the status filter tabs (All / Draft / Sent / Paid / Overdue) to quickly find unpaid invoices', 'Filter by client using the dropdown to see all invoices for a specific account'] },
        ],
      },
    ],
  },
  {
    id: 'client-portal',
    icon: <Globe size={18} />,
    title: 'Client Portal',
    color: 'text-teal-600 bg-teal-50',
    articles: [
      {
        title: 'What clients see in their portal',
        content: [
          { type: 'para', text: 'Clients with a Client role log in and land directly on their portal. They cannot access agency pages like Clients, AI Studio, or Settings.' },
          { type: 'steps', items: ['Welcome banner — shows agency name, client name, domain, and overall platform score ring', 'Stats row — average platform score, active platforms, approved posts count, action items count', 'Platform Scores — progress bars for each platform that has been audited', 'Latest Audit — score ring and date of the most recent audit', 'Priority Actions — top optimization fixes flagged by the agency', 'Action Required — pending action items assigned by the agency (with due dates)', 'Messages — in-app message thread with the agency team', 'Approved Content — recent posts that have been approved'] },
          { type: 'tip', text: 'The portal uses your agency\'s brand colours and logo set in Settings → Branding.' },
        ],
      },
      {
        title: 'Downloading a PDF report (client view)',
        content: [
          { type: 'steps', items: ['Log in as a client user — land on the portal', 'In the top-right of the welcome banner, click "Download My Report"', 'A branded PDF is generated and downloaded with all current platform stats and scores'] },
          { type: 'note', text: 'Reports are generated on-demand — they always reflect the most current data at the time of download.' },
        ],
      },
      {
        title: 'Viewing and tracking action items (client view)',
        content: [
          { type: 'steps', items: ['Log in as a client — scroll to the "Action Required" section on the portal', 'All PENDING and IN PROGRESS items assigned by the agency are listed', 'Each item shows the title, description, due date, and current status', 'Overdue items are highlighted with a red background — these need immediate attention'] },
          { type: 'note', text: 'Clients cannot create or close action items. Contact your Account Manager to update item status or add new ones.' },
        ],
      },
      {
        title: 'Messaging your account team (client view)',
        content: [
          { type: 'steps', items: ['Log in as a client — scroll to the "Messages" section at the bottom of the portal', 'Type a message in the input box and click Send (or press Enter)', 'Your account manager receives an email notification', 'Their reply appears in the thread — it refreshes every 30 seconds automatically'] },
          { type: 'tip', text: 'Use messages for quick questions, sharing assets, or requesting changes. For formal deliverables use the Action Items system.' },
        ],
      },
    ],
  },
  {
    id: 'activity',
    icon: <Activity size={18} />,
    title: 'Activity Log',
    color: 'text-slate-600 bg-slate-50',
    articles: [
      {
        title: 'Reading the activity feed',
        role: 'Owner',
        content: [
          { type: 'para', text: 'The Activity Log gives you a full audit trail of every significant action taken in the app — posts approved, invoices created, audits completed, and more.' },
          { type: 'steps', items: ['Go to Activity in the sidebar', 'Events are grouped by Today, Yesterday, and earlier dates', 'Each entry shows: who did it, what they did, which resource was affected, and when', 'Use the filter tabs at the top to filter by action type (e.g. show only POST_APPROVED events)'] },
          { type: 'note', text: 'The Activity Log is read-only and cannot be edited or deleted. It is the source of truth for team accountability.' },
        ],
      },
    ],
  },
  {
    id: 'profile',
    icon: <User size={18} />,
    title: 'My Profile',
    color: 'text-cyan-600 bg-cyan-50',
    articles: [
      {
        title: 'Updating your name or email',
        content: [
          { type: 'steps', items: ['Go to Settings → My Profile tab, or click your name at the bottom of the sidebar', 'Under Account Info, edit your Full Name and/or Email Address', 'Click Save Profile'] },
          { type: 'note', text: 'If you change your email address, use the new email to log in next time.' },
        ],
      },
      {
        title: 'Changing your password',
        content: [
          { type: 'steps', items: ['Go to Settings → My Profile tab, or click your name in the sidebar', 'Scroll to the Change Password section', 'Enter your Current Password (use the eye icon to verify), then your New Password (minimum 8 characters)', 'Confirm the new password and click Save Profile'] },
          { type: 'tip', text: 'If you\'ve forgotten your current password, ask the Agency Owner to reset it for you from Settings → Team.' },
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
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/help/guide.pdf', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NEDS-Drishti-Platform-Guide.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — PDF endpoint may not be deployed yet
    } finally {
      setDownloading(false);
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Guide</h1>
          <p className="text-gray-500 mt-1 text-sm">{totalArticles} articles across {SECTIONS.length} modules</p>
        </div>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
        >
          {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
          {downloading ? 'Generating…' : 'Download PDF Guide'}
        </button>
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
