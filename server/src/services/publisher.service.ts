import { decrypt, isEncrypted } from '../lib/encryption';
import { logger } from '../lib/logger';

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedUrl?: string;
  error?: string;
}

interface PostPayload {
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
}

function decryptToken(raw: string): string {
  return isEncrypted(raw) ? decrypt(raw) : raw;
}

function buildText(post: PostPayload): string {
  const parts = [post.caption];
  if (post.hashtags.length > 0) parts.push(post.hashtags.map(h => `#${h}`).join(' '));
  return parts.join('\n\n');
}

// ─── Facebook Pages ────────────────────────────────────────────────────────────

export async function publishToFacebook(post: PostPayload, pageId: string, rawToken: string): Promise<PublishResult> {
  const token = decryptToken(rawToken);
  const text = buildText(post);

  try {
    let endpoint: string;
    let body: Record<string, string>;

    if (post.mediaUrls.length > 0) {
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
      body = { url: post.mediaUrls[0], caption: text, access_token: token };
    } else {
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      body = { message: text, access_token: token };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { id?: string; error?: { message: string } };

    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }

    return {
      success: true,
      platformPostId: json.id,
      publishedUrl: json.id ? `https://www.facebook.com/${json.id}` : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    logger.error({ msg: 'Facebook publish error', error: msg });
    return { success: false, error: msg };
  }
}

// ─── Instagram Graph API ───────────────────────────────────────────────────────

export async function publishToInstagram(post: PostPayload, igAccountId: string, rawToken: string): Promise<PublishResult> {
  const token = decryptToken(rawToken);
  const text = buildText(post);

  if (post.mediaUrls.length === 0) {
    return { success: false, error: 'Instagram requires at least one image. Add media to this post before scheduling.' };
  }

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: post.mediaUrls[0], caption: text, access_token: token }),
    });
    const container = await containerRes.json() as { id?: string; error?: { message: string } };

    if (!containerRes.ok || container.error) {
      return { success: false, error: container.error?.message ?? `Container creation failed: HTTP ${containerRes.status}` };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const published = await publishRes.json() as { id?: string; error?: { message: string } };

    if (!publishRes.ok || published.error) {
      return { success: false, error: published.error?.message ?? `Publish step failed: HTTP ${publishRes.status}` };
    }

    return {
      success: true,
      platformPostId: published.id,
      publishedUrl: `https://www.instagram.com/p/${published.id}/`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    logger.error({ msg: 'Instagram publish error', error: msg });
    return { success: false, error: msg };
  }
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export async function publishToLinkedIn(post: PostPayload, accountId: string, rawToken: string): Promise<PublishResult> {
  const token = decryptToken(rawToken);
  const text = buildText(post);

  // accountId should be either "organization:123456" or "person:abc123"
  const author = `urn:li:${accountId}`;

  try {
    const body = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { id?: string; message?: string; serviceErrorCode?: number };

    if (!res.ok) {
      return { success: false, error: json.message ?? `HTTP ${res.status}` };
    }

    return {
      success: true,
      platformPostId: json.id,
      publishedUrl: json.id
        ? `https://www.linkedin.com/feed/update/${encodeURIComponent(json.id)}/`
        : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    logger.error({ msg: 'LinkedIn publish error', error: msg });
    return { success: false, error: msg };
  }
}

// ─── Test connection ───────────────────────────────────────────────────────────

export async function testSocialConnection(platform: string, accountId: string, rawToken: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  const token = decryptToken(rawToken);

  try {
    if (platform === 'FACEBOOK') {
      const res = await fetch(`https://graph.facebook.com/v21.0/${accountId}?fields=name,id&access_token=${token}`);
      const json = await res.json() as { name?: string; error?: { message: string } };
      if (json.error) return { ok: false, error: json.error.message };
      return { ok: true, name: json.name };
    }

    if (platform === 'INSTAGRAM') {
      const res = await fetch(`https://graph.facebook.com/v21.0/${accountId}?fields=name,username&access_token=${token}`);
      const json = await res.json() as { name?: string; username?: string; error?: { message: string } };
      if (json.error) return { ok: false, error: json.error.message };
      return { ok: true, name: json.username ?? json.name };
    }

    if (platform === 'LINKEDIN') {
      const res = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { localizedFirstName?: string; localizedLastName?: string; message?: string };
      if (!res.ok) return { ok: false, error: json.message ?? `HTTP ${res.status}` };
      return { ok: true, name: `${json.localizedFirstName ?? ''} ${json.localizedLastName ?? ''}`.trim() };
    }

    return { ok: false, error: `Platform ${platform} test not supported yet` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
