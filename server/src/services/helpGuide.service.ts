import puppeteer from 'puppeteer';

const GUIDE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; font-size: 9pt; color: #1f2937; line-height: 1.5; background: #fff; }

  /* Cover */
  .cover { page-break-after: always; min-height: 260mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #1a3c2e 0%, #c8522a 100%); color: #fff; padding: 30mm 20mm; border-radius: 4mm; }
  .cover-badge { font-size: 8pt; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.7; margin-bottom: 10mm; }
  .cover-title { font-size: 32pt; font-weight: 800; line-height: 1.1; margin-bottom: 6mm; }
  .cover-sub { font-size: 12pt; opacity: 0.8; margin-bottom: 16mm; }
  .cover-divider { width: 30mm; height: 1px; background: rgba(255,255,255,0.4); margin: 0 auto 12mm; }
  .cover-meta { font-size: 8.5pt; opacity: 0.65; }

  /* TOC */
  .toc-page { page-break-after: always; padding: 6mm 0; }
  .toc-title { font-size: 16pt; font-weight: 700; color: #111827; margin-bottom: 8mm; padding-bottom: 3mm; border-bottom: 2px solid #e5e7eb; }
  .toc-item { display: flex; justify-content: space-between; align-items: baseline; padding: 2mm 0; border-bottom: 1px dotted #e5e7eb; }
  .toc-item-name { font-size: 9.5pt; font-weight: 500; color: #374151; }
  .toc-item-num { font-size: 8pt; color: #9ca3af; }
  .toc-section { font-size: 10.5pt; font-weight: 700; color: #111827; margin-top: 5mm; margin-bottom: 1mm; }
  .toc-article { font-size: 9pt; color: #6b7280; padding-left: 5mm; padding-top: 1mm; padding-bottom: 1mm; }

  /* Section header */
  .section-header { page-break-before: always; display: flex; align-items: center; gap: 4mm; margin-bottom: 7mm; padding-bottom: 4mm; border-bottom: 2px solid #e5e7eb; }
  .section-icon { width: 9mm; height: 9mm; border-radius: 2mm; display: flex; align-items: center; justify-content: center; font-size: 14pt; flex-shrink: 0; }
  .section-title { font-size: 17pt; font-weight: 800; color: #111827; }
  .section-count { font-size: 8pt; color: #9ca3af; margin-top: 0.5mm; }

  /* Article */
  .article { margin-bottom: 8mm; break-inside: avoid; }
  .article-title { font-size: 11pt; font-weight: 700; color: #111827; margin-bottom: 3mm; padding: 2.5mm 3.5mm; background: #f9fafb; border-left: 3px solid #1a3c2e; border-radius: 0 2mm 2mm 0; }
  .role-badge { display: inline-block; font-size: 7pt; font-weight: 600; padding: 0.5mm 2.5mm; border-radius: 10mm; background: #ede9fe; color: #6d28d9; margin-left: 2mm; vertical-align: middle; }

  /* Content types */
  .para { color: #374151; font-size: 9pt; line-height: 1.55; margin-bottom: 3mm; }
  .steps { list-style: none; margin: 0 0 3mm; padding: 0; }
  .steps li { display: flex; gap: 2.5mm; align-items: flex-start; margin-bottom: 1.5mm; }
  .step-num { flex-shrink: 0; width: 4.5mm; height: 4.5mm; border-radius: 50%; background: #d1fae5; color: #065f46; font-size: 6.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 0.3mm; }
  .step-text { font-size: 9pt; color: #374151; line-height: 1.45; }
  .note { display: flex; gap: 2mm; background: #fffbeb; border: 1px solid #fde68a; border-radius: 2mm; padding: 2mm 3mm; margin-bottom: 3mm; }
  .note-label { font-size: 7pt; font-weight: 700; color: #b45309; flex-shrink: 0; margin-top: 0.5mm; }
  .note-text { font-size: 8.5pt; color: #78350f; line-height: 1.4; }
  .tip { display: flex; gap: 2mm; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 2mm; padding: 2mm 3mm; margin-bottom: 3mm; }
  .tip-label { font-size: 7pt; font-weight: 700; color: #1d4ed8; flex-shrink: 0; margin-top: 0.5mm; }
  .tip-text { font-size: 8.5pt; color: #1e3a8a; line-height: 1.4; }
  .subheading { font-size: 9.5pt; font-weight: 700; color: #374151; margin: 3mm 0 1.5mm; }

  /* Roles table */
  .roles-table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
  .roles-table tr { border-bottom: 1px solid #f3f4f6; }
  .roles-table td { padding: 2mm 2.5mm; font-size: 8.5pt; vertical-align: top; }
  .roles-table .role-name { font-weight: 700; white-space: nowrap; padding-right: 3mm; }
  .role-owner { color: #7c3aed; }
  .role-am { color: #2563eb; }
  .role-cc { color: #db2777; }
  .role-seo { color: #16a34a; }
  .role-client { color: #4b5563; }

  /* Footer */
  .page-footer { position: fixed; bottom: 6mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 2mm; }
  .footer-brand { font-size: 7pt; color: #9ca3af; font-weight: 500; }
  .footer-page { font-size: 7pt; color: #9ca3af; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-badge">Agency OS · Platform Guide</div>
  <div class="cover-title">NEDS Drishti<br>Complete Guide</div>
  <div class="cover-sub">Your full reference for every feature, tool, and workflow</div>
  <div class="cover-divider"></div>
  <div class="cover-meta">nedsdrishti.in · Last updated May 2026</div>
</div>

<!-- PAGE FOOTER (fixed) -->
<div class="page-footer">
  <span class="footer-brand">NEDS Drishti Platform Guide</span>
  <span class="footer-page">nedsdrishti.in</span>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc-page">
  <div class="toc-title">Table of Contents</div>

  <div class="toc-section">1. Getting Started</div>
  <div class="toc-article">How to log in · Understanding your role · Navigating the app</div>

  <div class="toc-section">2. Client Management</div>
  <div class="toc-article">Adding clients · Assigning team members · Health scores · Client invite · Onboarding questionnaire · Action Items · In-app messaging · Deleting a client</div>

  <div class="toc-section">3. Content Studio</div>
  <div class="toc-article">Creating posts · Templates · Hashtag sets · Media library · Post approval workflow · Content Calendar · Ideas Engine</div>

  <div class="toc-section">4. AI Studio (11 Tools)</div>
  <div class="toc-article">Caption Generator · Hashtag Research · Profile Bio Writer · Audit Report Writer · Content Repurposer · Audience Persona Builder · Competitor Analyzer · Posting Time Optimizer · Engagement Rate Analyzer · AI Search Visibility Audit · AI Usage</div>

  <div class="toc-section">5. Audit Module</div>
  <div class="toc-article">Running audits · Completing and sharing audits</div>

  <div class="toc-section">6. Optimize</div>
  <div class="toc-article">Platform checklists · Reading scores · AI Profile Rewrite</div>

  <div class="toc-section">7. Analytics & Reports</div>
  <div class="toc-article">Agency overview · Downloading reports · Email reports · Scheduled monthly reports · AI Weekly Digest</div>

  <div class="toc-section">8. Client Portal</div>
  <div class="toc-article">What clients see · Downloading reports · Action items · Messaging agency team</div>

  <div class="toc-section">9. Settings</div>
  <div class="toc-article">Branding · API keys (Dashboard shortcut) · Team management · Webhooks · Signature verification</div>

  <div class="toc-section">10. Invoices</div>
  <div class="toc-article">Creating invoices · Status workflow · PDF download · Tracking payments</div>

  <div class="toc-section">11. Activity Log</div>
  <div class="toc-article">Reading the activity feed</div>

  <div class="toc-section">12. My Profile & Notifications</div>
  <div class="toc-article">Updating details · Changing password · Notifications</div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 1: GETTING STARTED
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#eff6ff 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#dbeafe;color:#2563eb;">📖</div>
  <div>
    <div class="section-title">1. Getting Started</div>
    <div class="section-count">3 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">How to log in</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>nedsdrishti.in</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Enter your email and password</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Sign In</strong> — you'll land on your Dashboard</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Use the eye icon next to the password field to show or hide what you are typing.</span></div>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">If you forget your password, ask your Agency Owner to reset it from Settings → Team.</span></div>
</div>

<div class="article">
  <div class="article-title">Understanding your role</div>
  <p class="para">Every user has a role that controls what they can see and do. Your role is shown in the sidebar beneath your name.</p>
  <table class="roles-table">
    <tr><td class="role-name role-owner">Owner</td><td>Full access — billing, team management, settings, all clients.</td></tr>
    <tr><td class="role-name role-am">Account Manager</td><td>Manage clients, content, audits, and reports. Cannot invite users or change settings.</td></tr>
    <tr><td class="role-name role-cc">Content Creator</td><td>Create and edit posts, use AI Studio, manage media. Cannot delete clients.</td></tr>
    <tr><td class="role-name role-seo">SEO Analyst</td><td>Run audits, fill platform checklists, view analytics. Read-only on content.</td></tr>
    <tr><td class="role-name role-client">Client</td><td>Sees their own portal only — action items, messages, posts, platform scores, and PDF reports.</td></tr>
  </table>
</div>

<div class="article">
  <div class="article-title">Navigating the app</div>
  <p class="para">The sidebar on the left is your main navigation. Click the hamburger icon (☰) in the top-left to expand or collapse it.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text"><strong>Dashboard</strong> — agency-wide stats at a glance</span></li>
    <li><span class="step-num">2</span><span class="step-text"><strong>Clients</strong> — manage all client accounts</span></li>
    <li><span class="step-num">3</span><span class="step-text"><strong>AI Studio</strong> — 10 AI-powered tools for content, research, and audits</span></li>
    <li><span class="step-num">4</span><span class="step-text"><strong>Content</strong> — compose, schedule, and manage posts</span></li>
    <li><span class="step-num">5</span><span class="step-text"><strong>Analytics</strong> — reports, performance graphs, and AI digest</span></li>
    <li><span class="step-num">6</span><span class="step-text"><strong>Optimize</strong> — platform-by-platform SEO checklists with AI rewrite</span></li>
    <li><span class="step-num">7</span><span class="step-text"><strong>Invoices</strong> — create and manage client invoices (Owner · Account Manager)</span></li>
    <li><span class="step-num">8</span><span class="step-text"><strong>Activity</strong> — full audit trail of team actions (Owner only)</span></li>
    <li><span class="step-num">9</span><span class="step-text"><strong>Settings</strong> — branding, API keys, team, webhooks (Owner only)</span></li>
    <li><span class="step-num">10</span><span class="step-text"><strong>Help &amp; Guide</strong> — this page</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Click your name at the bottom of the sidebar at any time to open your Profile page and update your details or password.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 2: CLIENT MANAGEMENT
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#eef2ff 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#e0e7ff;color:#4f46e5;">👥</div>
  <div>
    <div class="section-title">2. Client Management</div>
    <div class="section-count">8 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Adding a new client <span class="role-badge">Owner · Account Manager</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to Clients → click <strong>New Client</strong> (top-right)</span></li>
    <li><span class="step-num">2</span><span class="step-text">Fill in: Business Name, Industry, Website URL, and Description</span></li>
    <li><span class="step-num">3</span><span class="step-text">Add Social Handles (optional) — Instagram, Facebook, LinkedIn, etc.</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Save Client</strong></span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">The client starts as ACTIVE. You can change status to INACTIVE or PAUSED from the client detail page.</span></div>
</div>

<div class="article">
  <div class="article-title">Assigning team members to a client <span class="role-badge">Owner · Account Manager</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open the client → click the <strong>Team</strong> tab</span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a team member from the dropdown and click <strong>Assign</strong></span></li>
    <li><span class="step-num">3</span><span class="step-text">To remove someone, click the trash icon next to their name</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Client health scores</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Green (≥70%) — Profiles well optimized</span></li>
    <li><span class="step-num">2</span><span class="step-text">Yellow (40–69%) — Some platforms need attention</span></li>
    <li><span class="step-num">3</span><span class="step-text">Red (&lt;40%) — Profiles need significant work</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Sending a client invite <span class="role-badge">Owner</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → Team</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Enter the client's email and select role: <strong>Client</strong></span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Invite</strong> — they receive an email with a one-time login link</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Client onboarding questionnaire <span class="role-badge">Owner · Account Manager</span></div>
  <p class="para">Send a branded, public questionnaire link to a new client so they can fill in their business details, goals, social handles, and brand voice — no login required.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open the client → go to the <strong>Reports</strong> tab</span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>"Send Onboarding Link"</strong> — emails a branded form to the client's contact email</span></li>
    <li><span class="step-num">3</span><span class="step-text">The client opens the link and completes 4 steps: Business basics, Social handles, Goals &amp; context, Brand identity</span></li>
    <li><span class="step-num">4</span><span class="step-text">On submission, their data is saved to the client record automatically</span></li>
    <li><span class="step-num">5</span><span class="step-text">Onboarding data (goals, brand tone, words to avoid, location) becomes available to AI tools</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">The link expires after 7 days. Resend from the Reports tab to generate a fresh token.</span></div>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">After the client submits, check the Overview tab — brand tone, words to avoid, and primary location are pre-populated.</span></div>
</div>

<div class="article">
  <div class="article-title">Action Items — assigning tasks to clients <span class="role-badge">Owner · Account Manager</span></div>
  <p class="para">Action Items are tasks or deliverables assigned to a client. They appear both in the client's portal and in your agency view.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open the client → click the <strong>Action Items</strong> tab</span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>"New Action Item"</strong> — enter title, optional description, and optional due date</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Create</strong> — the client receives an email notification</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Start</strong> to move to In Progress, or <strong>Done</strong> to mark as Completed</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Overdue items are highlighted with a red left border. Status flow: PENDING → IN PROGRESS → COMPLETED.</span></div>
</div>

<div class="article">
  <div class="article-title">Messaging clients in-app</div>
  <p class="para">Send and receive messages with a client directly inside the platform. Both agency team members and the client can initiate the conversation.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open the client → click the <strong>Messages</strong> tab</span></li>
    <li><span class="step-num">2</span><span class="step-text">Type a message and click <strong>Send</strong> (or press Enter)</span></li>
    <li><span class="step-num">3</span><span class="step-text">The message thread refreshes every 30 seconds automatically</span></li>
    <li><span class="step-num">4</span><span class="step-text">The client receives an email notification when a new message arrives</span></li>
    <li><span class="step-num">5</span><span class="step-text">Client side: open their portal → scroll to the Messages section</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Use Shift+Enter to add a line break without sending the message.</span></div>
</div>

<div class="article">
  <div class="article-title">Deleting a client <span class="role-badge">Owner</span></div>
  <p class="para">Deleting a client permanently removes the client record and all associated data — posts, audits, platform scores, invoices, messages, action items, and media.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open the client → click the red <strong>trash icon</strong> in the top-right header</span></li>
    <li><span class="step-num">2</span><span class="step-text">A confirmation dialog appears showing the client name</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>"Yes, delete"</strong> to permanently delete</span></li>
    <li><span class="step-num">4</span><span class="step-text">You are redirected to the Clients list automatically</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">This cannot be undone. All associated data is deleted permanently. Only the Owner role has access to the delete button.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 3: CONTENT STUDIO
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#fdf2f8 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#fce7f3;color:#be185d;">✏️</div>
  <div>
    <div class="section-title">3. Content Studio</div>
    <div class="section-count">7 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Creating a new post</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Content → New Post</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select the Client from the dropdown</span></li>
    <li><span class="step-num">3</span><span class="step-text">Choose one or more Platforms (LinkedIn, Instagram, etc.)</span></li>
    <li><span class="step-num">4</span><span class="step-text">Write your Caption in the text area or use <strong>AI Generate</strong></span></li>
    <li><span class="step-num">5</span><span class="step-text">Add Hashtags — type and press Enter or comma to add each one</span></li>
    <li><span class="step-num">6</span><span class="step-text">Optionally set a Scheduled Date &amp; Time — the post will be saved as <strong>Scheduled</strong> automatically</span></li>
    <li><span class="step-num">7</span><span class="step-text">Click <strong>Save as Draft</strong> or <strong>Save &amp; Schedule</strong></span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Posts with a scheduled date are automatically marked Scheduled. Posts without a date are saved as Draft.</span></div>
</div>

<div class="article">
  <div class="article-title">AI caption variant picker</div>
  <p class="para">The AI Generate button in the Content Composer produces 5 caption variants and displays them as a picker — choose the best one rather than editing a wall of text.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Write a brief topic or key message in the Caption field</span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a client and platform first (required for AI context)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>AI Generate</strong> — a violet panel replaces the textarea showing 5 variant cards</span></li>
    <li><span class="step-num">4</span><span class="step-text">Each card shows a preview of the caption and how many hashtags are included</span></li>
    <li><span class="step-num">5</span><span class="step-text">Click <strong>"Use this"</strong> on the variant you want — caption and hashtags load instantly</span></li>
    <li><span class="step-num">6</span><span class="step-text">Click × to dismiss the picker and return to manual editing</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Hashtags from the chosen variant are merged into the hashtag field automatically — no copy-pasting needed.</span></div>
</div>

<div class="article">
  <div class="article-title">Post approval and publish workflow</div>
  <p class="para">Every post moves through: <strong>Draft → Pending → Approved → Published.</strong></p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Content Creator saves a draft (approval status: Pending)</span></li>
    <li><span class="step-num">2</span><span class="step-text">Account Manager or Owner reviews the post and clicks <strong>Approve</strong> or <strong>Reject</strong></span></li>
    <li><span class="step-num">3</span><span class="step-text">On approval, the creator gets a bell notification</span></li>
    <li><span class="step-num">4</span><span class="step-text">Once approved, Owner or Account Manager clicks <strong>Publish</strong> — fires any post.published webhooks</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">A post must be Approved before it can be Published. You cannot publish a Pending or Rejected post.</span></div>
</div>

<div class="article">
  <div class="article-title">Content Calendar</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Content → Calendar</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">The calendar shows all scheduled posts by date</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click any date with a dot to see that day's posts</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click a post to open the editor</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Ideas Engine</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Content → Ideas</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a client and enter a topic or keyword</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Generate</strong> — AI produces a set of post ideas</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Save</strong> on any idea to keep it; click <strong>Use</strong> to load it into the composer</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Media Library</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Content → Media</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a client from the dropdown</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Upload Files</strong> to add images or videos (max 20 MB each)</span></li>
    <li><span class="step-num">4</span><span class="step-text">Images are auto-converted to WebP and resized to max 1920px</span></li>
    <li><span class="step-num">5</span><span class="step-text">Click the red trash icon on any asset to delete it</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Media is stored per-client. You must select a client before uploading.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 4: AI STUDIO
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#f5f3ff 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#ede9fe;color:#7c3aed;">🤖</div>
  <div>
    <div class="section-title">4. AI Studio</div>
    <div class="section-count">11 tools</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Caption Generator</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → Caption Generator</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select client, platform, and tone</span></li>
    <li><span class="step-num">3</span><span class="step-text">Enter a brief topic or key message</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Generate</strong> — get 5 caption variations</span></li>
    <li><span class="step-num">5</span><span class="step-text">Click <strong>Use</strong> on any caption to load it directly into the Content Composer</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Hashtag Research</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Select a client and enter a niche keyword</span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>Generate</strong> — AI returns a ranked hashtag list with volume estimates</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Copy All</strong> or copy individual hashtags</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Save as Set</strong> to store them for future posts</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Profile Bio Writer</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Select client and target platform</span></li>
    <li><span class="step-num">2</span><span class="step-text">Enter key services, tone, and USPs</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Generate</strong> — receive a character-count-optimised bio</span></li>
    <li><span class="step-num">4</span><span class="step-text">Copy and paste into the platform profile</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Audit Report Writer</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Select a client and choose a completed audit</span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>Generate Report</strong> — AI writes a full narrative audit report</span></li>
    <li><span class="step-num">3</span><span class="step-text">Review and edit inline</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Download PDF</strong> to produce a client-ready PDF</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Content Repurposer</div>
  <p class="para">Turn one piece of content into 5 platform-optimised formats at once.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → Content Repurposer</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a client (optional — adds brand context)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Paste your original content into the input box</span></li>
    <li><span class="step-num">4</span><span class="step-text">Select target platforms</span></li>
    <li><span class="step-num">5</span><span class="step-text">Click <strong>Repurpose</strong> — AI rewrites the content natively for each platform</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Audience Persona Builder</div>
  <p class="para">Generate a detailed ideal customer persona with demographics, psychographics, pain points, content triggers, and a messaging guide.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → Audience Persona Builder</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a client</span></li>
    <li><span class="step-num">3</span><span class="step-text">Enter product/service description, industry, and audience notes</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Build Persona</strong> — saved automatically to the client's record</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Competitor Analyzer</div>
  <p class="para">Analyse a competitor's social profile and get a gap analysis with actionable improvement recommendations.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → Competitor Analyzer</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select the client and enter the competitor's profile URL and platform</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Analyze</strong> — AI audits key profile elements and identifies gaps</span></li>
    <li><span class="step-num">4</span><span class="step-text">Receive a scored comparison with specific recommendations</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Posting Time Optimizer</div>
  <p class="para">Get an evidence-based weekly posting schedule grid for multiple platforms, tailored by audience location.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → Posting Time Optimizer</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select platforms (LinkedIn, Instagram, Facebook, Twitter, YouTube, TikTok, Pinterest, WhatsApp, Email, Google Ads)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Choose audience location (India, Global, US, UK, UAE, Australia) and posts per week</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Generate Schedule</strong> — colour-coded 7-day × 14-hour grid appears</span></li>
    <li><span class="step-num">5</span><span class="step-text">Green = Optimal · Yellow = Acceptable · Grey = Avoid</span></li>
    <li><span class="step-num">6</span><span class="step-text">Click <strong>"Get AI Custom Advice"</strong> (after entering industry) for tailored tips</span></li>
    <li><span class="step-num">7</span><span class="step-text">Click <strong>CSV</strong> to export recommended time slots</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Engagement Rate Analyzer</div>
  <p class="para">Calculate engagement rate, benchmark it against industry standards, and receive AI recommendations to improve it.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → Engagement Rate Analyzer</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select platform and enter followers, avg likes (required), and optionally comments, shares, and avg reach</span></li>
    <li><span class="step-num">3</span><span class="step-text">Add industry for accurate benchmarks (e.g. Fashion, SaaS, Restaurant)</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Analyze Engagement</strong></span></li>
    <li><span class="step-num">5</span><span class="step-text">See your engagement rate % with a rating: Excellent / Good / Average / Below Average / Poor</span></li>
    <li><span class="step-num">6</span><span class="step-text">View benchmarks and percentile — "Better than X% of accounts in your industry"</span></li>
    <li><span class="step-num">7</span><span class="step-text">AI recommendations appear as cards with <strong>Impact</strong> and <strong>Effort</strong> ratings</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Results are cached — re-running with the same inputs returns instantly. Change any input to force a fresh analysis.</span></div>
</div>

<div class="article">
  <div class="article-title">AI Search Visibility Audit</div>
  <p class="para">Score a client's visibility in AI-powered search engines — ChatGPT Search, Perplexity, and Google AI Overviews. GEO (Generative Engine Optimization) is the new SEO.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>AI Studio → AI Search Visibility Audit</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select a client (optional — adds brand context automatically)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Enter: Brand Name, Website, Industry, Location, Key Services, and Target Keywords</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>"Run AI Visibility Audit"</strong></span></li>
    <li><span class="step-num">5</span><span class="step-text">See an overall score out of 100 with a rating: Excellent / Good / Average / Below Average / Poor</span></li>
    <li><span class="step-num">6</span><span class="step-text">View 6 dimension scores with progress bars: Structured Data &amp; Schema · E-E-A-T Signals · Content Depth &amp; FAQs · Citation &amp; Mention Quality · Knowledge Panel Readiness · Review &amp; Reputation Signals</span></li>
    <li><span class="step-num">7</span><span class="step-text">Read <strong>4 Quick Wins</strong> — low-effort actions with high return</span></li>
    <li><span class="step-num">8</span><span class="step-text">Read <strong>3 Long-Term Strategies</strong> — high-impact investments for sustained visibility</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Results are cached for 3 days. Tick "Skip cache" after making changes to the client's digital presence to get a fresh audit.</span></div>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">The audit is based on AI analysis of the information you provide — it does not crawl the website live. Provide accurate details for the most relevant recommendations.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 5: AUDIT MODULE
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#f0fdf4 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#dcfce7;color:#15803d;">✅</div>
  <div>
    <div class="section-title">5. Audit Module</div>
    <div class="section-count">2 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Running a new audit <span class="role-badge">Owner · Account Manager · SEO Analyst</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to Clients → open a client → click <strong>Audits</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>New Audit</strong> and select the audit type</span></li>
    <li><span class="step-num">3</span><span class="step-text">The system generates a checklist of items to review</span></li>
    <li><span class="step-num">4</span><span class="step-text">Work through each check — mark Pass, Fail, or N/A</span></li>
    <li><span class="step-num">5</span><span class="step-text">Add notes to any item for client-facing context</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">A new audit shows "Not Started" (grey) on the list — this is not an automated scan. Once you mark any check, the label changes to "In Progress" (blue). Click "Mark Complete" when all checks are done.</span></div>
</div>

<div class="article">
  <div class="article-title">Completing and sharing an audit</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Once all items are reviewed, click <strong>Mark Complete</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">The audit locks and a notification is sent to assigned team members</span></li>
    <li><span class="step-num">3</span><span class="step-text">Go to <strong>AI Studio → Audit Report Writer</strong> to generate a PDF narrative</span></li>
    <li><span class="step-num">4</span><span class="step-text">Download the PDF and share with the client</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Completed audits cannot be edited. Create a new audit if you need to re-check.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 6: OPTIMIZE
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#fefce8 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#fef9c3;color:#a16207;">⚡</div>
  <div>
    <div class="section-title">6. Optimize</div>
    <div class="section-count">3 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Platform optimization checklists</div>
  <p class="para">Optimize tracks how well each client's social profiles are set up — bio, cover image, contact info, posting frequency, and more.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Optimize</strong> → select a client</span></li>
    <li><span class="step-num">2</span><span class="step-text">See all platforms with a progress bar for each</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click a platform to open its checklist</span></li>
    <li><span class="step-num">4</span><span class="step-text">Check off each completed item — progress saves automatically</span></li>
    <li><span class="step-num">5</span><span class="step-text">The client health score on the Clients page updates in real time</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Reading the score</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Score = checked items ÷ total items × 100</span></li>
    <li><span class="step-num">2</span><span class="step-text">Green ≥70% · Yellow 40–69% · Red &lt;40%</span></li>
    <li><span class="step-num">3</span><span class="step-text">Aim for 100% on primary platforms before moving to secondary ones</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">AI Profile Rewrite — 3 AI variants</div>
  <p class="para">For any checklist item that contains written copy (bio, headline, about section, ad copy), request 3 AI-written variants and apply the best one.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open a platform checklist (e.g. LinkedIn, Instagram, Google Business Profile)</span></li>
    <li><span class="step-num">2</span><span class="step-text">Find a text-based check (e.g. "LinkedIn Headline", "Instagram Bio")</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click the <strong>"AI Rewrite"</strong> button next to that check</span></li>
    <li><span class="step-num">4</span><span class="step-text">A slide-in panel opens showing 3 AI-generated variants, each within the platform's character limit</span></li>
    <li><span class="step-num">5</span><span class="step-text">Click <strong>"Use This"</strong> on any variant to copy it</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">AI rewrites use the client's brand name, industry, and onboarding data automatically. Complete the onboarding questionnaire first for best results.</span></div>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Available for: LinkedIn Headline &amp; About · Instagram Bio · GBP Description &amp; Review Responses · YouTube About &amp; Titles · Twitter/X Bio · TikTok Bio · Google Ads Copy · Email Subject Lines · WhatsApp Auto-Reply.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 7: ANALYTICS & REPORTS
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#fff7ed 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#fed7aa;color:#c2410c;">📊</div>
  <div>
    <div class="section-title">7. Analytics &amp; Reports</div>
    <div class="section-count">5 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Sending a client report by email <span class="role-badge">Owner · Account Manager</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open a Client → go to the <strong>Reports</strong> tab</span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>"Send Report Now"</strong> — generates a PDF and emails it to the client's contact email</span></li>
    <li><span class="step-num">3</span><span class="step-text">A confirmation toast appears once sent</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">SMTP must be configured in Settings → API Keys before email sending works.</span></div>
</div>

<div class="article">
  <div class="article-title">Scheduling automated monthly reports <span class="role-badge">Owner · Account Manager</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Open a Client → go to the <strong>Reports</strong> tab</span></li>
    <li><span class="step-num">2</span><span class="step-text">In the Schedule dropdown, select <strong>Monthly</strong></span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Save Schedule</strong> — system auto-emails PDF on the 1st of each month</span></li>
    <li><span class="step-num">4</span><span class="step-text">To stop, set schedule back to None</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">AI Weekly Digest <span class="role-badge">Owner</span></div>
  <p class="para">Get an AI-written narrative summary of your agency's activity — clients, posts, audits, invoices, and top scores.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Analytics</strong> → scroll to the "AI Weekly Digest" card</span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>"Generate Digest"</strong> — Claude analyses all agency data and writes a narrative summary</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>"Email Digest"</strong> to send it to the Owner's registered email</span></li>
  </ol>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 8: CLIENT PORTAL
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#f0fdfa 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#ccfbf1;color:#0f766e;">🌐</div>
  <div>
    <div class="section-title">8. Client Portal</div>
    <div class="section-count">4 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">What clients see in their portal</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text"><strong>Welcome banner</strong> — agency name, client name, domain, and overall score ring</span></li>
    <li><span class="step-num">2</span><span class="step-text"><strong>Stats row</strong> — avg platform score, active platforms, approved posts, action items count</span></li>
    <li><span class="step-num">3</span><span class="step-text"><strong>Platform Scores</strong> — progress bars for each platform</span></li>
    <li><span class="step-num">4</span><span class="step-text"><strong>Latest Audit</strong> — score ring and date of most recent audit</span></li>
    <li><span class="step-num">5</span><span class="step-text"><strong>Action Required</strong> — pending/in-progress action items with due dates</span></li>
    <li><span class="step-num">6</span><span class="step-text"><strong>Messages</strong> — in-app thread with agency team</span></li>
    <li><span class="step-num">7</span><span class="step-text"><strong>Approved Content</strong> — recent posts approved for publishing</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">The portal uses your agency's brand colours and logo set in Settings → Branding.</span></div>
</div>

<div class="article">
  <div class="article-title">Downloading a report (client view)</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Log in — land on the portal</span></li>
    <li><span class="step-num">2</span><span class="step-text">In the top-right of the welcome banner, click <strong>"Download My Report"</strong></span></li>
    <li><span class="step-num">3</span><span class="step-text">A branded PDF is generated and downloaded with all current platform stats</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Viewing action items (client view)</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Log in as a client → scroll to the <strong>"Action Required"</strong> section</span></li>
    <li><span class="step-num">2</span><span class="step-text">All PENDING and IN PROGRESS items appear with due dates</span></li>
    <li><span class="step-num">3</span><span class="step-text">Overdue items are highlighted in red</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Clients cannot create or close action items. Contact your Account Manager to update them.</span></div>
</div>

<div class="article">
  <div class="article-title">Messaging the agency team (client view)</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Log in → scroll to the <strong>Messages</strong> section</span></li>
    <li><span class="step-num">2</span><span class="step-text">Type a message and click <strong>Send</strong> (or press Enter)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Your account manager receives an email notification</span></li>
    <li><span class="step-num">4</span><span class="step-text">The thread refreshes every 30 seconds automatically</span></li>
  </ol>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 9: SETTINGS
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#f9fafb 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#f3f4f6;color:#374151;">⚙️</div>
  <div>
    <div class="section-title">9. Settings</div>
    <div class="section-count">8 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Agency branding <span class="role-badge">Owner</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → Branding</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Upload your agency logo (PNG or SVG, max 2 MB)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Set primary and secondary brand colours using the colour pickers</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Save Branding</strong> — all PDF reports will use these colours and logo</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Connecting API keys <span class="role-badge">Owner</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → API Keys</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Enter keys for: Anthropic (required for all AI), SMTP email, Google PSI, Ahrefs, DataForSEO</span></li>
    <li><span class="step-num">3</span><span class="step-text">Keys are stored AES-256 encrypted — nobody can read them back</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Save Keys</strong></span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">From the Dashboard, the Setup Reminder "Go to Settings →" link opens directly on the API Keys tab for quick first-time setup.</span></div>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Never share API keys over Slack or email. Use this Settings page only.</span></div>
</div>

<div class="article">
  <div class="article-title">Deactivating or reactivating a team member <span class="role-badge">Owner</span></div>
  <p class="para">Deactivating a member blocks their login immediately without deleting their account or reassigning their work.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → Team</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Click <strong>Deactivate</strong> next to the member's name — their login is blocked immediately</span></li>
    <li><span class="step-num">3</span><span class="step-text">To restore access, click <strong>Reactivate</strong> on the same row</span></li>
  </ol>
  <div class="tip"><span class="tip-label">TIP</span><span class="tip-text">Use Deactivate for temporary suspension (e.g. someone on leave) and Remove for permanent departures.</span></div>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">You cannot deactivate your own account. The Deactivate button is hidden on your own row.</span></div>
</div>

<div class="article">
  <div class="article-title">Removing a team member permanently <span class="role-badge">Owner</span></div>
  <p class="para">Permanently removes the member's account. Their posts and audit notes are reassigned to the agency Owner so no work is lost.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → Team</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Click the <strong>trash icon</strong> on the member's row</span></li>
    <li><span class="step-num">3</span><span class="step-text">An inline confirmation appears — click <strong>Yes, remove</strong> to confirm or <strong>Cancel</strong> to abort</span></li>
    <li><span class="step-num">4</span><span class="step-text">The account is deleted and cannot be recovered</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Owner accounts cannot be removed. To remove yourself, ask another Owner to do it.</span></div>
</div>

<div class="article">
  <div class="article-title">Setting up webhooks <span class="role-badge">Owner</span></div>
  <p class="para">Webhooks let you send real-time HTTP notifications to external tools (Zapier, Slack, your own systems) when events happen in the app.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → Webhooks → Add Webhook</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Enter a name and the endpoint URL</span></li>
    <li><span class="step-num">3</span><span class="step-text">Tick the events to subscribe to</span></li>
    <li><span class="step-num">4</span><span class="step-text">Click <strong>Create</strong> — a signing secret is generated automatically</span></li>
  </ol>
  <p class="para" style="margin-top:2mm;"><strong>Available events:</strong> post.approved · post.rejected · post.published · invoice.sent · invoice.paid · audit.completed</p>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 10: INVOICES
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#f0fdf4 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#d1fae5;color:#065f46;">🧾</div>
  <div>
    <div class="section-title">10. Invoices</div>
    <div class="section-count">4 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Creating an invoice <span class="role-badge">Owner · Account Manager</span></div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Invoices → New Invoice</strong></span></li>
    <li><span class="step-num">2</span><span class="step-text">Select the client from the dropdown</span></li>
    <li><span class="step-num">3</span><span class="step-text">Add line items: description, quantity, and rate</span></li>
    <li><span class="step-num">4</span><span class="step-text">Set Issue Date and Due Date; add Tax % if applicable</span></li>
    <li><span class="step-num">5</span><span class="step-text">Click <strong>Save Invoice</strong> — saved as Draft with auto-generated number (INV-YYYY-NNN)</span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Invoice status workflow</div>
  <p class="para">Invoices move through: <strong>Draft → Sent → Paid</strong> (or Overdue).</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text"><strong>Draft</strong> — created but not shared with client</span></li>
    <li><span class="step-num">2</span><span class="step-text"><strong>Mark Sent</strong> — fires invoice.sent webhook</span></li>
    <li><span class="step-num">3</span><span class="step-text"><strong>Mark Paid</strong> — once payment received; fires invoice.paid webhook</span></li>
    <li><span class="step-num">4</span><span class="step-text"><strong>Mark Overdue</strong> — if due date passes without payment</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Only Draft invoices can be deleted. Sent, Paid, and Overdue invoices are permanent records.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 11: ACTIVITY LOG
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#f8fafc 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#f1f5f9;color:#475569;">📋</div>
  <div>
    <div class="section-title">11. Activity Log</div>
    <div class="section-count">1 article</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Reading the activity feed <span class="role-badge">Owner</span></div>
  <p class="para">The Activity Log gives you a full audit trail of every significant action taken in the app — posts approved, invoices created, audits completed, and more.</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Activity</strong> in the sidebar</span></li>
    <li><span class="step-num">2</span><span class="step-text">Events are grouped by Today, Yesterday, and earlier dates</span></li>
    <li><span class="step-num">3</span><span class="step-text">Each entry shows: who did it, what they did, which resource was affected, and when</span></li>
    <li><span class="step-num">4</span><span class="step-text">Use the filter tabs to filter by action type</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">The Activity Log is read-only and cannot be edited or deleted. It is the source of truth for team accountability.</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SECTION 12: PROFILE & NOTIFICATIONS
═══════════════════════════════════════════════════════ -->
<div class="section-header" style="background:linear-gradient(90deg,#ecfeff 0%,#fff 100%);padding:3mm 4mm;border-radius:2mm;">
  <div class="section-icon" style="background:#cffafe;color:#0e7490;">👤</div>
  <div>
    <div class="section-title">12. My Profile &amp; Notifications</div>
    <div class="section-count">4 articles</div>
  </div>
</div>

<div class="article">
  <div class="article-title">Updating your name or email</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → My Profile</strong> tab, or click your name at the bottom of the sidebar</span></li>
    <li><span class="step-num">2</span><span class="step-text">Under Account Info, edit your Full Name and/or Email Address</span></li>
    <li><span class="step-num">3</span><span class="step-text">Click <strong>Save Profile</strong></span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Changing your password</div>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text">Go to <strong>Settings → My Profile</strong> tab, or click your name in the sidebar</span></li>
    <li><span class="step-num">2</span><span class="step-text">Scroll to <strong>Change Password</strong> — enter your Current Password (use the eye icon to verify it), then your New Password (minimum 8 characters)</span></li>
    <li><span class="step-num">3</span><span class="step-text">Confirm the new password and click <strong>Save Profile</strong></span></li>
  </ol>
</div>

<div class="article">
  <div class="article-title">Understanding notifications</div>
  <p class="para">The bell icon in the top-right shows your unread notification count. Key notifications:</p>
  <ol class="steps">
    <li><span class="step-num">1</span><span class="step-text"><strong>Post Approved</strong> — your post was approved by a manager</span></li>
    <li><span class="step-num">2</span><span class="step-text"><strong>Post Rejected</strong> — your post was sent back for revision</span></li>
    <li><span class="step-num">3</span><span class="step-text"><strong>Audit Completed</strong> — an audit you're assigned to was completed</span></li>
  </ol>
  <div class="note"><span class="note-label">NOTE</span><span class="note-text">Notifications refresh every 30 seconds automatically.</span></div>
</div>

</body>
</html>`;

async function renderToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateHelpGuidePDF(): Promise<Buffer> {
  return renderToPdf(GUIDE_HTML);
}
