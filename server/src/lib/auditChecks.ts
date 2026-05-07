export interface AuditCheckDef {
  id: string;
  name: string;
  category: string;
  weight: number;
  description?: string;
  benchmark?: string;
  howToCheck?: string;
}

export interface AuditModuleDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  checks: AuditCheckDef[];
}

export const AUDIT_MODULES: AuditModuleDef[] = [
  {
    id: 'website',
    name: 'Website & Technical',
    icon: '🌐',
    description: 'Technical health, speed, security and crawlability',
    checks: [
      { id: 'ws_ssl', name: 'SSL Certificate', category: 'security', weight: 5, description: 'HTTPS active, valid cert, no mixed-content warnings', benchmark: 'Green padlock in all browsers' },
      { id: 'ws_pagespeed_mobile', name: 'PageSpeed — Mobile', category: 'performance', weight: 5, description: 'Google PSI mobile score', benchmark: '≥ 70 Good, ≥ 90 Excellent' },
      { id: 'ws_pagespeed_desktop', name: 'PageSpeed — Desktop', category: 'performance', weight: 4, description: 'Google PSI desktop score', benchmark: '≥ 90 Good' },
      { id: 'ws_mobile_friendly', name: 'Mobile-Friendly Design', category: 'ux', weight: 4, description: 'Responsive layout, no horizontal scroll, tap targets ≥ 48px' },
      { id: 'ws_core_web_vitals', name: 'Core Web Vitals', category: 'performance', weight: 5, description: 'LCP < 2.5s, INP < 200ms, CLS < 0.1', benchmark: 'All three in "Good" range' },
      { id: 'ws_meta_tags', name: 'Meta Title & Description', category: 'seo', weight: 4, description: 'Homepage has unique title (50–60 chars) and meta description (150–160 chars)' },
      { id: 'ws_schema', name: 'Schema Markup', category: 'seo', weight: 3, description: 'JSON-LD structured data: Organization, LocalBusiness, or relevant type', howToCheck: 'Google Rich Results Test' },
      { id: 'ws_sitemap', name: 'XML Sitemap', category: 'technical', weight: 3, description: 'Sitemap.xml exists, submitted to GSC, all priority pages included' },
      { id: 'ws_robots', name: 'Robots.txt', category: 'technical', weight: 3, description: 'robots.txt present, not blocking important resources' },
      { id: 'ws_404', name: '404 Page & Redirects', category: 'ux', weight: 3, description: 'Custom 404 page, broken links fixed, 301 redirects in place' },
      { id: 'ws_analytics', name: 'Analytics Tracking', category: 'tracking', weight: 4, description: 'GA4 or equivalent installed, goals configured, conversion tracking active' },
      { id: 'ws_cta', name: 'CTA Visibility', category: 'conversion', weight: 4, description: 'Clear primary CTA above the fold, phone/WhatsApp/chat widget visible' },
    ],
  },
  {
    id: 'seo',
    name: 'On-Page SEO',
    icon: '🔍',
    description: 'Keyword targeting, content structure and link authority',
    checks: [
      { id: 'seo_title_tags', name: 'Title Tags — All Key Pages', category: 'on-page', weight: 5, description: 'Unique, keyword-rich titles on all major pages (Home, About, Services, Contact)', benchmark: '50–60 characters' },
      { id: 'seo_meta_desc', name: 'Meta Descriptions', category: 'on-page', weight: 4, description: 'Unique, compelling meta descriptions with CTA and keywords on all pages' },
      { id: 'seo_h1_structure', name: 'H1 & Heading Structure', category: 'on-page', weight: 4, description: 'One H1 per page with primary keyword, logical H2/H3 hierarchy' },
      { id: 'seo_keyword_targeting', name: 'Keyword Targeting', category: 'on-page', weight: 5, description: 'Target keyword in title, H1, first paragraph, and URL slug' },
      { id: 'seo_content_length', name: 'Content Depth', category: 'content', weight: 3, description: 'Key service pages ≥ 500 words; blog posts ≥ 800 words' },
      { id: 'seo_alt_tags', name: 'Image Alt Tags', category: 'on-page', weight: 3, description: 'All images have descriptive alt text with relevant keywords' },
      { id: 'seo_internal_linking', name: 'Internal Linking', category: 'authority', weight: 3, description: 'Pages link to each other logically; no orphan pages' },
      { id: 'seo_backlinks', name: 'Backlink Profile', category: 'authority', weight: 5, description: 'Domain Authority, referring domains, toxic link ratio', howToCheck: 'Ahrefs or Moz' },
      { id: 'seo_local', name: 'Local SEO Signals', category: 'local', weight: 4, description: 'NAP consistent across web, local keywords in content, location pages if multi-location' },
      { id: 'seo_url_structure', name: 'URL Structure', category: 'technical', weight: 3, description: 'Short, descriptive, hyphenated URLs — no parameters or stop words' },
      { id: 'seo_canonical', name: 'Canonical Tags', category: 'technical', weight: 3, description: 'Canonical tags on duplicate/near-duplicate pages; www vs non-www resolved' },
    ],
  },
  {
    id: 'gmb',
    name: 'Google Business Profile',
    icon: '📍',
    description: 'Local search presence and Google Maps optimisation',
    checks: [
      { id: 'gmb_claimed', name: 'Profile Claimed & Verified', category: 'setup', weight: 5, description: 'Profile is verified by Google — blue checkmark visible', benchmark: 'Essential — without this nothing else matters' },
      { id: 'gmb_nap', name: 'NAP Consistency', category: 'accuracy', weight: 5, description: 'Name, Address, Phone exactly match website and all directories' },
      { id: 'gmb_categories', name: 'Primary & Secondary Categories', category: 'setup', weight: 4, description: 'Primary category is the most specific match; 3–5 secondary categories selected' },
      { id: 'gmb_description', name: 'Business Description', category: 'content', weight: 4, description: '750-char description with primary keywords, services, and unique value proposition' },
      { id: 'gmb_photos', name: 'Photo Count & Quality', category: 'content', weight: 4, description: '100+ photos: exterior, interior, team, products, before/after, work samples' },
      { id: 'gmb_posts', name: 'GBP Post Frequency', category: 'activity', weight: 3, description: 'Weekly posts — offers, events, updates, products' },
      { id: 'gmb_reviews_volume', name: 'Review Volume', category: 'trust', weight: 5, description: '50+ reviews; actively requesting reviews from customers' },
      { id: 'gmb_reviews_rating', name: 'Review Rating', category: 'trust', weight: 5, description: 'Average ≥ 4.5 stars', benchmark: '4.5+ strongly preferred by Google' },
      { id: 'gmb_responses', name: 'Review Response Rate', category: 'trust', weight: 4, description: '100% of reviews responded to within 24 hours — both positive and negative' },
      { id: 'gmb_qa', name: 'Q&A Management', category: 'content', weight: 3, description: 'Common questions answered by business; no unanswered questions > 7 days old' },
      { id: 'gmb_services', name: 'Services / Menu Listed', category: 'setup', weight: 3, description: 'All services listed with descriptions and prices where applicable' },
      { id: 'gmb_attributes', name: 'Business Attributes', category: 'setup', weight: 2, description: 'Accessibility, payment methods, amenities, highlights all filled' },
    ],
  },
  {
    id: 'social',
    name: 'Social Media Presence',
    icon: '📱',
    description: 'Profile completeness, content consistency and engagement',
    checks: [
      { id: 'sm_profiles_complete', name: 'All Profiles 100% Complete', category: 'setup', weight: 5, description: 'Every active platform has: profile photo, cover, bio, website, CTA button' },
      { id: 'sm_brand_consistency', name: 'Brand Consistency Across Platforms', category: 'brand', weight: 4, description: 'Same logo, brand colours, tone of voice, and handle across all platforms' },
      { id: 'sm_posting_frequency', name: 'Posting Frequency', category: 'activity', weight: 5, description: 'Consistent posting schedule: Instagram 5–7x/week, LinkedIn 3–5x, Facebook 5x, YouTube 1x' },
      { id: 'sm_content_variety', name: 'Content Format Variety', category: 'content', weight: 4, description: 'Mix of Reels/short video, carousels, static posts, stories, live' },
      { id: 'sm_engagement_rate', name: 'Engagement Rate', category: 'metrics', weight: 5, description: 'Instagram ≥ 3%, LinkedIn ≥ 2%, Facebook ≥ 1%', benchmark: 'Engagement / Reach × 100' },
      { id: 'sm_response_time', name: 'DM & Comment Response Time', category: 'community', weight: 4, description: 'All comments and DMs responded to within 2 hours', benchmark: '< 1 hour is excellent' },
      { id: 'sm_hashtag_strategy', name: 'Hashtag Strategy', category: 'reach', weight: 3, description: 'Niche + medium + broad hashtag mix; no banned hashtags; hashtag sets per campaign' },
      { id: 'sm_stories_highlights', name: 'Stories & Highlights Active', category: 'content', weight: 3, description: '5+ active story highlights with branded covers' },
      { id: 'sm_link_in_bio', name: 'Link in Bio / Linktree', category: 'conversion', weight: 3, description: 'Link in bio tool in use; links to key pages (booking, product, WhatsApp)' },
      { id: 'sm_collab_ugc', name: 'Collaborations & UGC', category: 'growth', weight: 3, description: 'Regular collabs with creators/brands; UGC reposts with credit' },
    ],
  },
  {
    id: 'content',
    name: 'Content Strategy',
    icon: '✍️',
    description: 'Blog, video and content marketing effectiveness',
    checks: [
      { id: 'cs_blog_active', name: 'Blog / Articles Active', category: 'production', weight: 4, description: 'At least 2 high-quality articles published per month' },
      { id: 'cs_keyword_targeting', name: 'Content Targets Search Keywords', category: 'seo', weight: 5, description: 'Each article targets a specific keyword with search intent — informational, transactional, or local' },
      { id: 'cs_content_depth', name: 'Content Depth & Quality', category: 'quality', weight: 4, description: 'Articles are comprehensive (1,000+ words for competitive terms), well-structured, no thin content' },
      { id: 'cs_cta_usage', name: 'CTA in Every Piece', category: 'conversion', weight: 4, description: 'Every article has a clear CTA — subscribe, download, book, or contact' },
      { id: 'cs_lead_magnets', name: 'Lead Magnets / Downloadables', category: 'conversion', weight: 3, description: 'PDF guides, checklists, templates, or webinars available for email capture' },
      { id: 'cs_video_content', name: 'Video Content Present', category: 'production', weight: 4, description: 'YouTube channel active or video content embedded on website/social' },
      { id: 'cs_content_calendar', name: 'Content Calendar in Use', category: 'strategy', weight: 3, description: 'Planned 4–8 weeks ahead; topics tied to business goals, seasons, and launches' },
      { id: 'cs_repurposing', name: 'Content Repurposing System', category: 'efficiency', weight: 3, description: 'Blog → Reel → Carousel → Email → Story; each piece used across 5+ channels' },
      { id: 'cs_email_newsletter', name: 'Email Newsletter Active', category: 'nurture', weight: 4, description: 'Regular newsletter (min. monthly) to segmented list' },
      { id: 'cs_analytics_driven', name: 'Content Decisions Data-Driven', category: 'strategy', weight: 3, description: 'Top-performing content identified and reproduced; underperforming content audited' },
    ],
  },
  {
    id: 'ads',
    name: 'Paid Advertising',
    icon: '💰',
    description: 'Google Ads, Meta Ads and conversion tracking',
    checks: [
      { id: 'ads_google_active', name: 'Google Ads Account Active', category: 'setup', weight: 4, description: 'Campaigns running with current budget and up-to-date ad copy' },
      { id: 'ads_meta_active', name: 'Meta Ads Account Active', category: 'setup', weight: 4, description: 'Facebook/Instagram campaigns running — retargeting and prospecting' },
      { id: 'ads_conversion_tracking', name: 'Conversion Tracking Set Up', category: 'tracking', weight: 5, description: 'Google Ads conversion tags, Meta Pixel, and GA4 goals all firing correctly', benchmark: 'Without this, optimisation is impossible' },
      { id: 'ads_remarketing', name: 'Remarketing Audiences Active', category: 'targeting', weight: 4, description: 'Website visitor, customer list, and lookalike audiences in use' },
      { id: 'ads_ad_copy_quality', name: 'Ad Copy Quality', category: 'creative', weight: 4, description: 'Responsive search ads with 15 headlines, 4 descriptions; ads test CTAs and USPs' },
      { id: 'ads_landing_pages', name: 'Dedicated Landing Pages', category: 'conversion', weight: 5, description: 'Ads link to dedicated landing pages (not homepage); message match between ad and page' },
      { id: 'ads_quality_score', name: 'Google Quality Score', category: 'performance', weight: 4, description: 'Average Quality Score ≥ 7/10; low QS keywords paused or improved', benchmark: 'QS 7–10 = below-average CPC' },
      { id: 'ads_ctr', name: 'Click-Through Rate', category: 'performance', weight: 3, description: 'Google Search CTR ≥ 5%, Meta CTR ≥ 1.5%' },
      { id: 'ads_roas', name: 'Return on Ad Spend (ROAS)', category: 'performance', weight: 5, description: 'ROAS tracked per campaign; underperforming campaigns paused or optimised' },
      { id: 'ads_negative_keywords', name: 'Negative Keyword List', category: 'efficiency', weight: 3, description: 'Comprehensive negative keyword list preventing wasted spend' },
    ],
  },
  {
    id: 'email',
    name: 'Email Marketing',
    icon: '📧',
    description: 'List health, deliverability and automation flows',
    checks: [
      { id: 'em_list_size', name: 'Email List Size', category: 'list', weight: 3, description: 'Active subscriber count and growth trend', benchmark: '> 1,000 is a functional list for most businesses' },
      { id: 'em_list_hygiene', name: 'List Hygiene', category: 'list', weight: 4, description: 'Unsubscribes processed immediately, bounce rate < 2%, list cleaned quarterly' },
      { id: 'em_open_rate', name: 'Open Rate', category: 'performance', weight: 5, description: 'Average open rate', benchmark: '> 20% is good; > 30% is excellent for most industries' },
      { id: 'em_click_rate', name: 'Click-Through Rate', category: 'performance', weight: 4, description: 'Average CTR', benchmark: '> 2.5% is good; > 5% is excellent' },
      { id: 'em_welcome_sequence', name: 'Welcome Sequence Active', category: 'automation', weight: 5, description: '3–5 email welcome series triggered on signup — brand story, value, and CTA' },
      { id: 'em_abandon_cart', name: 'Abandoned Cart / Lead Sequence', category: 'automation', weight: 4, description: '3-email sequence triggered on cart abandonment or form partial-fill' },
      { id: 'em_segmentation', name: 'List Segmentation', category: 'targeting', weight: 4, description: 'Subscribers segmented by behaviour, purchase history, or interest' },
      { id: 'em_subject_lines', name: 'Subject Line Optimisation', category: 'content', weight: 4, description: 'A/B testing subject lines; personalisation tokens; curiosity/benefit hooks', benchmark: '< 50 characters performs best on mobile' },
      { id: 'em_mobile_optimised', name: 'Mobile-Optimised Templates', category: 'design', weight: 3, description: 'Single-column layouts, large text, thumb-friendly CTAs, tested on iOS and Android' },
      { id: 'em_spf_dkim', name: 'SPF / DKIM / DMARC Records', category: 'deliverability', weight: 5, description: 'All three DNS authentication records set correctly', benchmark: 'Without these, emails go to spam' },
    ],
  },
];

export const AUDIT_MODULE_MAP: Record<string, AuditModuleDef> = Object.fromEntries(
  AUDIT_MODULES.map(m => [m.id, m])
);

export function getAllCheckDefs(): { moduleId: string; check: AuditCheckDef }[] {
  return AUDIT_MODULES.flatMap(m => m.checks.map(c => ({ moduleId: m.id, check: c })));
}
