import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; font-size: 9pt; color: #1f2937; line-height: 1.55; background: #fff; }

  /* Cover */
  .cover { page-break-after: always; min-height: 255mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(140deg, #1a3c2e 0%, #c8522a 100%); color: #fff; padding: 28mm 20mm; border-radius: 4mm; }
  .cover-badge { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.65; margin-bottom: 8mm; }
  .cover-logo { font-size: 28pt; font-weight: 800; line-height: 1.1; margin-bottom: 3mm; }
  .cover-sub { font-size: 13pt; opacity: 0.75; margin-bottom: 14mm; font-weight: 500; }
  .cover-divider { width: 28mm; height: 1px; background: rgba(255,255,255,0.35); margin: 0 auto 10mm; }
  .cover-title { font-size: 22pt; font-weight: 700; margin-bottom: 5mm; }
  .cover-desc { font-size: 10pt; opacity: 0.7; line-height: 1.6; max-width: 110mm; }
  .cover-footer { margin-top: 18mm; font-size: 8pt; opacity: 0.5; }

  /* TOC */
  .toc-page { page-break-after: always; }
  .toc-title { font-size: 15pt; font-weight: 800; color: #111827; margin-bottom: 7mm; padding-bottom: 3mm; border-bottom: 2px solid #e5e7eb; }
  .toc-row { display: flex; justify-content: space-between; align-items: baseline; padding: 2.5mm 0; border-bottom: 1px dotted #e5e7eb; }
  .toc-section-label { font-size: 10pt; font-weight: 700; color: #1a3c2e; }
  .toc-topic-label { font-size: 8.5pt; color: #6b7280; padding-left: 5mm; }
  .toc-num { font-size: 7.5pt; color: #9ca3af; }

  /* Section header */
  .section { page-break-before: always; }
  .section-header { display: flex; align-items: center; gap: 3.5mm; margin-bottom: 6mm; padding-bottom: 3.5mm; border-bottom: 2.5px solid #1a3c2e; }
  .section-num { width: 9mm; height: 9mm; border-radius: 2mm; background: #1a3c2e; color: #fff; font-size: 11pt; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .section-title { font-size: 16pt; font-weight: 800; color: #111827; }
  .section-sub { font-size: 8.5pt; color: #6b7280; margin-top: 0.5mm; }

  /* Content blocks */
  .block { margin-bottom: 6mm; break-inside: avoid; }
  .block-title { font-size: 10.5pt; font-weight: 700; color: #111827; margin-bottom: 2.5mm; padding: 2mm 3mm; background: #f9fafb; border-left: 3px solid #1a3c2e; border-radius: 0 2mm 2mm 0; }
  .block-title.orange { border-color: #c8522a; }
  p { margin-bottom: 2.5mm; font-size: 8.8pt; color: #374151; }
  ul, ol { padding-left: 5mm; margin-bottom: 2.5mm; }
  li { font-size: 8.8pt; color: #374151; margin-bottom: 1.2mm; }
  strong { font-weight: 600; color: #111827; }

  /* Role cards */
  .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin-bottom: 5mm; }
  .role-card { border: 1px solid #e5e7eb; border-radius: 3mm; padding: 3.5mm; }
  .role-name { font-size: 9.5pt; font-weight: 700; color: #1a3c2e; margin-bottom: 1.5mm; }
  .role-badge { display: inline-block; font-size: 6.5pt; font-weight: 700; padding: 0.5mm 2mm; border-radius: 10mm; background: #dcfce7; color: #166534; margin-bottom: 2mm; }
  .role-badge.am { background: #dbeafe; color: #1d4ed8; }
  .role-badge.cc { background: #fef9c3; color: #854d0e; }
  .role-badge.sa { background: #f3e8ff; color: #7e22ce; }
  .role-badge.cl { background: #f1f5f9; color: #475569; }

  /* Tool cards */
  .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 4mm; }
  .tool-card { border: 1px solid #e5e7eb; border-radius: 2.5mm; padding: 3mm; }
  .tool-name { font-size: 8.5pt; font-weight: 700; color: #111827; margin-bottom: 1mm; }
  .tool-cat { font-size: 6.5pt; font-weight: 600; padding: 0.5mm 2mm; border-radius: 10mm; display: inline-block; margin-bottom: 1.5mm; }
  .tool-cat.content { background: #ede9fe; color: #6d28d9; }
  .tool-cat.social { background: #fce7f3; color: #be185d; }
  .tool-cat.ads { background: #fef3c7; color: #92400e; }
  .tool-cat.research { background: #e0f2fe; color: #0369a1; }
  .tool-cat.email { background: #dcfce7; color: #166534; }
  .tool-desc { font-size: 7.5pt; color: #6b7280; line-height: 1.5; }

  /* Step list */
  .steps { counter-reset: step; margin-bottom: 4mm; }
  .step { counter-increment: step; display: flex; gap: 3mm; margin-bottom: 2.5mm; align-items: flex-start; }
  .step-num { width: 6mm; height: 6mm; border-radius: 50%; background: #1a3c2e; color: #fff; font-size: 7pt; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 0.3mm; }
  .step-text { font-size: 8.8pt; color: #374151; line-height: 1.5; }

  /* Tips / callouts */
  .tip { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 2.5mm; padding: 2.5mm 3.5mm; margin-bottom: 3mm; font-size: 8.5pt; color: #166534; break-inside: avoid; }
  .tip strong { color: #14532d; }
  .warn { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 2.5mm; padding: 2.5mm 3.5mm; margin-bottom: 3mm; font-size: 8.5pt; color: #9a3412; break-inside: avoid; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 8pt; }
  th { background: #1a3c2e; color: #fff; padding: 2mm 3mm; text-align: left; font-weight: 600; }
  td { padding: 2mm 3mm; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }

  /* Monthly playbook */
  .week { margin-bottom: 4mm; break-inside: avoid; }
  .week-title { font-size: 9.5pt; font-weight: 700; color: #fff; background: #1a3c2e; padding: 2mm 3.5mm; border-radius: 2mm 2mm 0 0; }
  .week-body { border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 2mm 2mm; padding: 3mm; }

  /* Footer note */
  .footer-note { margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #e5e7eb; font-size: 7.5pt; color: #9ca3af; text-align: center; }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════
     COVER
══════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-badge">Internal Team Document</div>
  <div class="cover-logo">NEDS Drishti</div>
  <div class="cover-sub">by Niranjan Enterprises Digital Solutions</div>
  <div class="cover-divider"></div>
  <div class="cover-title">Team Playbook</div>
  <div class="cover-desc">Everything your team needs to run the platform confidently — roles, workflows, AI tools, client management, and the monthly operating rhythm.</div>
  <div class="cover-footer">Version 4 · May 2026 · Confidential — Internal Use Only</div>
</div>

<!-- ══════════════════════════════════════════
     TABLE OF CONTENTS
══════════════════════════════════════════ -->
<div class="toc-page">
  <div class="toc-title">Contents</div>

  <div class="toc-row"><span class="toc-section-label">1. Roles &amp; Access</span><span class="toc-num">3</span></div>
  <div class="toc-row"><span class="toc-topic-label">Owner · Account Manager · Content Creator · SEO Analyst · Client</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">2. Client Onboarding</span><span class="toc-num">4</span></div>
  <div class="toc-row"><span class="toc-topic-label">Add client · Assign team · Send onboarding link · Review submissions</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">3. Content Studio</span><span class="toc-num">5</span></div>
  <div class="toc-row"><span class="toc-topic-label">Compose · AI Generate · Schedule · Approve · Calendar</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">4. AI Studio — 11 Tools</span><span class="toc-num">6</span></div>
  <div class="toc-row"><span class="toc-topic-label">Caption · Rewriter · Repurposer · Thread/Carousel · Bio · Hashtags · Ad Copy · Persona · Competitor · Email · AI Search Visibility</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">5. Client Communication</span><span class="toc-num">7</span></div>
  <div class="toc-row"><span class="toc-topic-label">Action Items · Messages · Client Portal</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">6. Audit &amp; Platform Optimize</span><span class="toc-num">8</span></div>
  <div class="toc-row"><span class="toc-topic-label">Run audit · Score cards · Per-check AI suggestions · Optimize workspace</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">7. Analytics, Reports &amp; Client Portal</span><span class="toc-num">9</span></div>
  <div class="toc-row"><span class="toc-topic-label">Dashboard · PDF reports · AI digest · Schedule monthly emails</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">8. Invoices, Settings &amp; Activity</span><span class="toc-num">10</span></div>
  <div class="toc-row"><span class="toc-topic-label">Create invoices · Branding · API keys · Team management · Activity log</span></div>

  <div class="toc-row" style="margin-top:3mm"><span class="toc-section-label">9. Monthly Operating Playbook</span><span class="toc-num">11</span></div>
  <div class="toc-row"><span class="toc-topic-label">Week-by-week rhythm · Who does what · Checklists</span></div>
</div>

<!-- ══════════════════════════════════════════
     1. ROLES & ACCESS
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">1</div>
    <div><div class="section-title">Roles &amp; Access</div><div class="section-sub">Who can do what on the platform</div></div>
  </div>

  <div class="role-grid">
    <div class="role-card">
      <div class="role-name">Owner</div>
      <div class="role-badge">Full Access</div>
      <ul>
        <li>All agency settings &amp; billing</li>
        <li>Create / delete clients</li>
        <li>Manage team (invite, promote, remove)</li>
        <li>Approve / reject content posts</li>
        <li>View Activity Log</li>
        <li>Create &amp; send invoices</li>
        <li>Access all AI tools</li>
        <li>Generate AI weekly digest</li>
      </ul>
    </div>
    <div class="role-card">
      <div class="role-name">Account Manager</div>
      <div class="role-badge am">Account Manager</div>
      <ul>
        <li>Create &amp; edit clients</li>
        <li>Assign team to clients</li>
        <li>Approve / reject content posts</li>
        <li>Send onboarding links &amp; reports</li>
        <li>Create action items &amp; messages</li>
        <li>All AI tools</li>
        <li>Invoices (view + send)</li>
        <li>View Activity Feed</li>
      </ul>
    </div>
    <div class="role-card">
      <div class="role-name">Content Creator</div>
      <div class="role-badge cc">Content Creator</div>
      <ul>
        <li>Compose &amp; schedule posts</li>
        <li>Use AI Studio tools</li>
        <li>Upload media to library</li>
        <li>Manage hashtag sets</li>
        <li>View clients (assigned)</li>
        <li>Cannot approve posts</li>
        <li>Cannot delete clients</li>
      </ul>
    </div>
    <div class="role-card">
      <div class="role-name">SEO Analyst</div>
      <div class="role-badge sa">SEO Analyst</div>
      <ul>
        <li>Run &amp; manage audits</li>
        <li>Platform optimization checks</li>
        <li>AI suggestions per check</li>
        <li>Download audit PDFs</li>
        <li>View analytics</li>
        <li>Use AI Studio tools</li>
        <li>Cannot manage team or billing</li>
      </ul>
    </div>
  </div>

  <div class="block">
    <div class="block-title">Client Role (Portal Only)</div>
    <p>Clients log in via their own portal (<strong>/portal</strong>) — they see their dashboard, platform scores, approved content, action items, and messages. They cannot access any agency-side pages.</p>
  </div>

  <div class="tip"><strong>Tip:</strong> To change a team member's role, go to <strong>Settings → Team</strong>, click the role dropdown next to their name, and save. Role changes take effect on their next page load.</div>
</div>

<!-- ══════════════════════════════════════════
     2. CLIENT ONBOARDING
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">2</div>
    <div><div class="section-title">Client Onboarding</div><div class="section-sub">From lead to fully set-up client in 4 steps</div></div>
  </div>

  <div class="block">
    <div class="block-title">Step 1 — Create the Client</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Go to <strong>Clients → New Client</strong></div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">Fill in: Business name, contact email, industry, location, brand name, target audience, competitors</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Set status to <strong>Active</strong> and click Save. The creator is auto-assigned.</div></div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">Step 2 — Assign Team Members</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Open the client → go to the <strong>Team</strong> tab</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">Click <strong>Assign Member</strong>, select the user, click Assign</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Assigned users see this client in their dashboard and content filters</div></div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">Step 3 — Send Onboarding Questionnaire</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Go to client → <strong>Reports tab → Send Onboarding Link</strong></div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">A branded email is sent to the client's contact email with a secure link (valid 7 days)</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Client fills in: business info, social handles, goals, brand identity — no login required</div></div>
      <div class="step"><div class="step-num">4</div><div class="step-text">Submission auto-populates the client record (industry, audience, brand tone, competitors, handles)</div></div>
    </div>
    <div class="tip"><strong>Note:</strong> You can resend the link at any time — it resets the token and expires the old one. Each client has one active link at a time.</div>
  </div>

  <div class="block">
    <div class="block-title">Step 4 — Review &amp; Configure Platforms</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Review the submitted data in <strong>Client → Overview</strong></div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">Go to <strong>Platforms tab</strong> — run the first optimization check for each active platform</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Create the first <strong>Action Items</strong> based on the top FAIL/WARN checks</div></div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════
     3. CONTENT STUDIO
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">3</div>
    <div><div class="section-title">Content Studio</div><div class="section-sub">Compose, schedule, approve, and publish posts for clients</div></div>
  </div>

  <div class="block">
    <div class="block-title">Creating a Post</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Select client</strong> — required before generating captions or adding media</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Select platforms</strong> — character limit shown automatically per platform combination</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Write caption</strong> — or type a brief topic and click <strong>AI Generate</strong> (client must be selected first). A <strong>variant picker</strong> appears showing 5 cards — click <strong>"Use this"</strong> on the one you want. The caption and its hashtags load instantly. Click × to dismiss and write manually.</div></div>
      <div class="step"><div class="step-num">4</div><div class="step-text"><strong>Add hashtags</strong> — type and press Enter, or load from a saved set</div></div>
      <div class="step"><div class="step-num">5</div><div class="step-text"><strong>Add media</strong> — pick from the client's media library (upload images/videos there first)</div></div>
      <div class="step"><div class="step-num">6</div><div class="step-text"><strong>Set schedule date &amp; time</strong> — if filled, clicking either Save button automatically sets status to Scheduled</div></div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">Save Options</div>
    <table>
      <tr><th>Button</th><th>Status set</th><th>When to use</th></tr>
      <tr><td><strong>Save as Draft</strong></td><td>Draft (if no date set)</td><td>Work in progress, not ready for review</td></tr>
      <tr><td><strong>Save &amp; Schedule</strong></td><td>Scheduled</td><td>New post with a future date — appears in Scheduled tab</td></tr>
      <tr><td><em>Either button with date set</em></td><td>Scheduled automatically</td><td>Setting a date/time always marks the post as Scheduled</td></tr>
    </table>
  </div>

  <div class="block">
    <div class="block-title">Approval Workflow</div>
    <p>Content Creators submit posts → Owner or Account Manager sees the <strong>Approval bar</strong> at the top when editing. They click <strong>Approve</strong> (turns green) or <strong>Reject</strong> (sends back for revision). Only approved posts can be published.</p>
  </div>

  <div class="block">
    <div class="block-title">Content Calendar</div>
    <p>Go to <strong>Content → Calendar</strong> to see all scheduled posts in a monthly grid. Click any post chip to jump straight to editing.</p>
  </div>

  <div class="tip"><strong>Templates:</strong> In the composer, click the Templates button next to the Caption label to load a saved template, or save the current caption as a new template for reuse. Click × in the top-right of the popup to close it without selecting.</div>
</div>

<!-- ══════════════════════════════════════════
     4. AI STUDIO
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">4</div>
    <div><div class="section-title">AI Studio — 11 Tools</div><div class="section-sub">Powered by Claude · always select a client for brand-aware output</div></div>
  </div>

  <p style="margin-bottom:4mm">Go to <strong>AI Studio</strong> in the sidebar. Select the client first — the AI uses their brand name, industry, and audience to personalise every output. Results are cached so identical inputs reuse the previous result (skip cache with the checkbox).</p>

  <div class="tool-grid">
    <div class="tool-card">
      <div class="tool-cat content">Content</div>
      <div class="tool-name">Caption Generator</div>
      <div class="tool-desc">5 platform-optimised caption variants in a clean numbered list. Provide a topic brief and select the platform and tone.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat content">Content</div>
      <div class="tool-name">Content Rewriter</div>
      <div class="tool-desc">3 rewritten variants of any existing content: professional, conversational, and bold. Great for repurposing older posts.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat content">Content</div>
      <div class="tool-name">Content Repurposer</div>
      <div class="tool-desc">Turn one piece of content (blog, video, podcast) into 10 platform-native formats. Paste text — do not paste a URL.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat content">Content</div>
      <div class="tool-name">Thread / Carousel Writer</div>
      <div class="tool-desc">LinkedIn carousel (10 slides) or Twitter/X thread (10 tweets) from any topic. Includes hook, slides/tweets, and CTA.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat content">Content</div>
      <div class="tool-name">Post Ideas Generator</div>
      <div class="tool-desc">30 content ideas with format, hook, and 2–3 point outline each. Use at the start of every content month.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat social">Social</div>
      <div class="tool-name">Profile Bio Optimizer</div>
      <div class="tool-desc">3 optimised bio variants with keyword analysis and character counts for any social platform.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat social">Social</div>
      <div class="tool-name">Hashtag Research Tool</div>
      <div class="tool-desc">30 hashtags across 3 tiers (niche / mid / broad) formatted as a table. Saved automatically to the client's hashtag sets.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat ads">Ads</div>
      <div class="tool-name">Ad Copy Generator</div>
      <div class="tool-desc">Google Ads (15 headlines, 4 descriptions, RSA combos, sitelinks) and/or Meta Ads copy. Location and keyword-aware.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat research">Research</div>
      <div class="tool-name">Audience Persona Builder</div>
      <div class="tool-desc">Full persona: demographics, psychographics, pain points, goals, objections, content triggers, and messaging guide.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat research">Research</div>
      <div class="tool-name">Competitor Analyzer</div>
      <div class="tool-desc">Content gaps, positioning opportunities, 10 content ideas competitors aren't doing, and differentiation strategy.</div>
    </div>
    <div class="tool-card">
      <div class="tool-cat email">Email &amp; Reviews</div>
      <div class="tool-name">Email Copy Writer</div>
      <div class="tool-desc">Full email campaign: 5 subject line variants, preview text, body with hook/value/CTA, and button text options.</div>
    </div>
  </div>

  <div class="block">
    <div class="block-title orange">★ NEW — AI Search Visibility Audit (GEO)</div>
    <p>Go to <strong>AI Studio → AI Search Visibility Audit</strong>. Enter the client's brand name, website, industry, location, key services, and target keywords. The AI scores their visibility across 6 dimensions:</p>
    <ul style="margin:2mm 0 2mm 5mm">
      <li><strong>Schema &amp; Structured Data</strong> — machine-readable signals</li>
      <li><strong>E-E-A-T Signals</strong> — expertise, authoritativeness, trustworthiness</li>
      <li><strong>Content Depth</strong> — how well content answers intent questions</li>
      <li><strong>Citation Worthiness</strong> — likelihood of being cited by AI engines</li>
      <li><strong>Knowledge Graph</strong> — entity recognition and association</li>
      <li><strong>Online Reputation</strong> — reviews, mentions, sentiment</li>
    </ul>
    <p>Output: an overall score (0–100), per-dimension scores, 4 Quick Wins (low effort, high impact), and 3 Long-Term Strategies. Use this as the starting point for any GEO (Generative Engine Optimisation) service.</p>
    <div class="tip"><strong>When to use:</strong> At the start of an SEO/GEO engagement, at quarterly reviews, or when a client asks "why aren't we showing up in ChatGPT / Google AI answers?"</div>
  </div>

  <div class="block">
    <div class="block-title">Posting Time Optimizer &amp; Engagement Analyzer</div>
    <p><strong>Posting Time Optimizer</strong> (AI Studio → Posting Time Optimizer): Evidence-based optimal times per platform and location. Enable "Custom AI advice" with the industry field for tailored tips.</p>
    <p><strong>Engagement Analyzer</strong> (AI Studio → Engagement Rate Analyzer): Input follower count, avg likes/comments/shares. Get engagement rate, industry benchmark, percentile, and AI improvement recommendations (triggered automatically for average or below-average accounts).</p>
  </div>
</div>

<!-- ══════════════════════════════════════════
     5. CLIENT COMMUNICATION
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">5</div>
    <div><div class="section-title">Client Communication</div><div class="section-sub">Action Items, Messages, and the Client Portal</div></div>
  </div>

  <div class="block">
    <div class="block-title">Action Items</div>
    <p>Go to <strong>Client → Action Items tab</strong>. Action items are tasks assigned to the client (e.g. "Share your logo files", "Approve this month's content plan").</p>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Click <strong>New Action Item</strong> — enter title, description, and due date</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">An email notification is sent to the client's contact email automatically</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Progress: <strong>Start</strong> (→ In Progress) → <strong>Done</strong> (→ Completed). Overdue items show a red border.</div></div>
    </div>
    <div class="tip"><strong>Note:</strong> The due date field accepts a calendar date — always fill it in so the client sees a deadline in their portal.</div>
  </div>

  <div class="block">
    <div class="block-title">Messages</div>
    <p>Go to <strong>Client → Messages tab</strong> for a threaded chat between the agency and the client. Messages are visible to both sides (agency staff see the full thread; client sees it in their portal). Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for a new line. Messages are marked as read automatically when the tab is opened.</p>
  </div>

  <div class="block">
    <div class="block-title">Client Portal</div>
    <p>Clients log in at <strong>nedsdrishti.in</strong> with their own credentials and see:</p>
    <ul>
      <li>Overall platform health score</li>
      <li>Per-platform optimization scores</li>
      <li>Last audit results</li>
      <li>Pending action items (with due dates)</li>
      <li>Approved content posts</li>
      <li>Message thread with the agency</li>
      <li>Monthly performance report download</li>
    </ul>
  </div>
</div>

<!-- ══════════════════════════════════════════
     6. AUDIT & PLATFORM OPTIMIZE
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">6</div>
    <div><div class="section-title">Audit &amp; Platform Optimize</div><div class="section-sub">Score every aspect of a client's digital presence</div></div>
  </div>

  <div class="block">
    <div class="block-title">Running an Audit</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Go to <strong>Clients → [Client] → Run Audit</strong> (or navigate to <strong>/audit/:clientId</strong>)</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">Select audit type — the system runs 70+ checks across 7 modules: Website, SEO, Google My Business, Social, Content, Ads, Email</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Review each check: mark PASS / WARN / FAIL / N/A, add notes and evidence links</div></div>
      <div class="step"><div class="step-num">4</div><div class="step-text">Click <strong>Mark Complete</strong> — the audit is locked and a score is calculated</div></div>
      <div class="step"><div class="step-num">5</div><div class="step-text">Download the branded PDF report from the audit detail page</div></div>
    </div>
    <div class="tip"><strong>Status labels:</strong> A freshly created audit shows <strong>"Not Started"</strong> (grey) on the audit list — this is not an automated scan. Once you mark any check, it changes to <strong>"In Progress"</strong> (blue). It becomes <strong>"Completed"</strong> (green) only after you click Mark Complete.</div>
  </div>

  <div class="block">
    <div class="block-title">Platform Optimizer</div>
    <p>Go to <strong>Optimize → [Client]</strong>. Each platform (LinkedIn, Instagram, Facebook, Google My Business, YouTube, Twitter, TikTok, Pinterest, Google Ads, Email, WhatsApp) has a score card showing PASS/WARN/FAIL check counts and a score trend chart.</p>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Click a platform card to open the workspace</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">Use the category sidebar to navigate check groups</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Set each check to PASS / WARN / FAIL / N/A with notes and evidence</div></div>
      <div class="step"><div class="step-num">4</div><div class="step-text">Click <strong>Get AI Suggestion</strong> on any FAIL/WARN check for a specific recommendation</div></div>
      <div class="step"><div class="step-num">5</div><div class="step-text">Use <strong>Run AI for All</strong> to bulk-fill AI suggestions for all missing checks at once</div></div>
    </div>
    <div class="tip"><strong>Optimize Home:</strong> The /optimize page shows all clients as cards with their average score and per-platform bars — great for spotting which clients need attention at a glance.</div>
  </div>
</div>

<!-- ══════════════════════════════════════════
     7. ANALYTICS, REPORTS & PORTAL
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">7</div>
    <div><div class="section-title">Analytics, Reports &amp; Client Portal</div><div class="section-sub">Data, PDFs, and the weekly AI digest</div></div>
  </div>

  <div class="block">
    <div class="block-title">Analytics Dashboard</div>
    <p>Go to <strong>Analytics</strong> in the sidebar. See: total clients, posts this month, average platform score, total AI usage, platform score bar chart, post status breakdown, top clients by score, audit tiles, and recent posts. PDF download button at the top right.</p>
  </div>

  <div class="block">
    <div class="block-title">Client Performance Reports</div>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Go to <strong>Client → Reports tab</strong></div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Send Report Now</strong> — generates a branded A4 PDF with scores, content activity, and audit results; emails it to the client's contact email instantly</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Schedule</strong> — set monthly/weekly/biweekly; the system auto-emails on the 1st of each month (or per schedule)</div></div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">AI Weekly Digest</div>
    <p>Go to <strong>Dashboard → Generate AI Digest</strong>. Claude writes a narrative summary of the week's agency activity (posts published, clients updated, audits run, AI usage). Send it to yourself or the owner's email as a weekly briefing.</p>
  </div>

  <div class="block">
    <div class="block-title">Platform Guide PDF</div>
    <p>Team members can download the full platform guide at any time: go to <strong>Help</strong> in the sidebar → click <strong>Download PDF Guide</strong>. The guide is always generated live with the latest content.</p>
  </div>
</div>

<!-- ══════════════════════════════════════════
     8. INVOICES, SETTINGS & ACTIVITY
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">8</div>
    <div><div class="section-title">Invoices, Settings &amp; Activity</div><div class="section-sub">Billing, configuration, and audit trail</div></div>
  </div>

  <div class="block">
    <div class="block-title">Invoices</div>
    <p>Go to <strong>Invoices</strong> in the sidebar (Owner and Account Manager only).</p>
    <ul>
      <li>Create invoices with line items, tax percentage, due date</li>
      <li>Invoice numbers auto-generated: INV-YYYY-NNN</li>
      <li>Status flow: <strong>Draft → Sent → Paid → Overdue</strong></li>
      <li>PDF generated and emailed to client on Send</li>
      <li>Webhooks fire on invoice.sent and invoice.paid events</li>
    </ul>
  </div>

  <div class="block">
    <div class="block-title">Settings</div>
    <table>
      <tr><th>Tab</th><th>What you can do</th></tr>
      <tr><td><strong>Branding</strong></td><td>Agency name, logo, primary &amp; accent colours, font, tagline — applied across client portals and PDFs</td></tr>
      <tr><td><strong>API Keys</strong></td><td>Add Anthropic (AI), SMTP (email), PageSpeed, Ahrefs, DataForSEO keys. All stored AES-256 encrypted. Shortcut available from Dashboard setup reminder.</td></tr>
      <tr><td><strong>Team</strong></td><td>Invite team members by email, set role, remove members</td></tr>
      <tr><td><strong>Webhooks</strong></td><td>Create webhook endpoints for post.approved, post.published, invoice.sent, etc. Each has an HMAC-SHA256 signing secret.</td></tr>
      <tr><td><strong>My Profile</strong></td><td>Change your name, email, or password (requires current password)</td></tr>
    </table>
  </div>

  <div class="block">
    <div class="block-title">Activity Log</div>
    <p>Go to <strong>Activity</strong> in the sidebar (Owner and Account Manager only). Every significant action is logged: client created/deleted, post approved, invoice sent, audit completed, onboarding submitted. Filter by action type. Useful for team accountability and client audit trails.</p>
  </div>

  <div class="tip"><strong>AI Usage Dashboard:</strong> Go to <strong>AI Studio → Usage Dashboard</strong> to see monthly AI costs by tool, total tokens used, and the full generation history. Monitor for budget spikes here.</div>
</div>

<!-- ══════════════════════════════════════════
     9. MONTHLY OPERATING PLAYBOOK
══════════════════════════════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">9</div>
    <div><div class="section-title">Monthly Operating Playbook</div><div class="section-sub">The week-by-week rhythm for running client accounts</div></div>
  </div>

  <div class="week">
    <div class="week-title">Week 1 — Plan &amp; Create</div>
    <div class="week-body">
      <table>
        <tr><th>Who</th><th>Task</th></tr>
        <tr><td>AM</td><td>Review last month's analytics; send performance report to each client</td></tr>
        <tr><td>AM</td><td>Create action items for the month; update client briefs if goals changed</td></tr>
        <tr><td>CC</td><td>Run <strong>Post Ideas Generator</strong> for each client (30 ideas per client per platform)</td></tr>
        <tr><td>CC</td><td>Draft &amp; schedule the month's content in Content Studio; submit for approval</td></tr>
        <tr><td>AM</td><td>Approve or reject content; send feedback via Messages</td></tr>
        <tr><td>SA</td><td>Run platform optimization checks; update PASS/WARN/FAIL on all active platforms</td></tr>
      </table>
    </div>
  </div>

  <div class="week">
    <div class="week-title">Week 2 — Optimise &amp; Audit</div>
    <div class="week-body">
      <table>
        <tr><th>Who</th><th>Task</th></tr>
        <tr><td>SA</td><td>Run AI suggestions for all FAIL checks using "Run AI for All"</td></tr>
        <tr><td>SA</td><td>Run AI Search Visibility Audit for clients in GEO engagements</td></tr>
        <tr><td>SA</td><td>Run full audit if due; download and share PDF with AM</td></tr>
        <tr><td>AM</td><td>Review optimization results; create new action items for critical fixes</td></tr>
        <tr><td>CC</td><td>Generate any mid-month ad copy or email campaigns needed</td></tr>
      </table>
    </div>
  </div>

  <div class="week">
    <div class="week-title">Week 3 — Engage &amp; Adjust</div>
    <div class="week-body">
      <table>
        <tr><th>Who</th><th>Task</th></tr>
        <tr><td>AM</td><td>Check Messages — respond to any client queries in the portal</td></tr>
        <tr><td>AM</td><td>Review action item statuses; chase any overdue items with client</td></tr>
        <tr><td>CC</td><td>Top up content schedule if gaps found in calendar view</td></tr>
        <tr><td>SA</td><td>Run Engagement Analyzer for key clients; document rate vs. benchmark</td></tr>
        <tr><td>All</td><td>Check AI Usage Dashboard — watch for unexpected cost spikes</td></tr>
      </table>
    </div>
  </div>

  <div class="week">
    <div class="week-title">Week 4 — Report &amp; Wrap</div>
    <div class="week-body">
      <table>
        <tr><th>Who</th><th>Task</th></tr>
        <tr><td>Owner</td><td>Generate AI Weekly Digest; review agency-wide performance</td></tr>
        <tr><td>AM</td><td>Confirm all scheduled reports are set up (will auto-send on 1st)</td></tr>
        <tr><td>AM</td><td>Create / send any pending invoices; follow up on outstanding payments</td></tr>
        <tr><td>AM</td><td>Brief the team on next month's priorities in the Messages or action items</td></tr>
        <tr><td>All</td><td>Archive completed action items; review activity log for the month</td></tr>
      </table>
    </div>
  </div>

  <div class="warn"><strong>Monthly report emails</strong> fire automatically on the 1st of each month for clients with a schedule set. Verify the schedule is configured in Client → Reports for every retainer client.</div>

  <div class="footer-note">NEDS Drishti Team Playbook · Version 4 · May 2026 · Confidential — Internal Use Only · nedsdrishti.in</div>
</div>

</body>
</html>`;

async function generate() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(HTML, { waitUntil: 'networkidle0' });
  console.log('Generating PDF...');
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', right: '14mm', bottom: '18mm', left: '14mm' },
  });
  await browser.close();

  const outPath = path.join(__dirname, 'NEDS-Drishti-Team-Playbook.pdf');
  writeFileSync(outPath, pdf);
  console.log(`Done — ${Math.round(pdf.length / 1024)} KB → ${outPath}`);
}

generate().catch(err => { console.error(err); process.exit(1); });
