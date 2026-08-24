import { supabase } from './supabase.js';

const params = new URLSearchParams(location.search);

// Supports both the old profile.html?u=Username URL and clean /Username URLs.
let username = params.get('u');

if (!username) {
  const path = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  const parts = path.split('/').filter(Boolean);
  username = parts.length ? parts[parts.length - 1] : null;

  // Ignore normal site pages.
  if (['index.html', 'profile.html', 'login.html', 'signup.html', 'dashboard.html', 'settings.html', 'forgot-password.html', 'reset-password.html'].includes(username?.toLowerCase())) {
    username = null;
  }
}

const nameEl = document.querySelector('#profile-name');
const bioEl = document.querySelector('#profile-bio');

if (!username) {
  nameEl.textContent = 'Profile not found';
  bioEl.textContent = 'No username was provided.';
} else {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle();

  if (error || !profile) {
    nameEl.textContent = 'Profile not found';
    bioEl.textContent = 'This Snipe profile does not exist.';
  } else {
    document.title = `${profile.display_name || profile.username} — Snipe`;

    nameEl.textContent = profile.display_name || profile.username;
    document.querySelector('#profile-username').textContent = `@${profile.username}`;

    const avatar = document.querySelector('#profile-avatar');
    if (profile.avatar_url) {
      avatar.innerHTML = `<img src="${profile.avatar_url}" alt="${profile.display_name || profile.username}">`;
    } else {
      avatar.textContent = (profile.display_name || profile.username).slice(0, 1).toUpperCase();
    }

    bioEl.textContent = profile.bio || '';
    document.querySelector('#views').textContent = `${profile.profile_views ?? 0} views`;

    const socials = [
      ['Discord', profile.discord_url],
      ['GitHub', profile.github_url],
      ['YouTube', profile.youtube_url],
      ['Twitter / X', profile.twitter_url],
      ['Instagram', profile.instagram_url],
      ['TikTok', profile.tiktok_url]
    ];

    const links = document.querySelector('#links');

    for (const [name, url] of socials) {
      if (!url) continue;

      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = name;
      a.style.cssText = 'display:block;padding:13px;border:1px solid rgba(255,255,255,.09);border-radius:10px;color:#c9ccd3;background:rgba(255,255,255,.025);font-size:12px;font-weight:600;';
      links.appendChild(a);
    }

    const { data: badges } = await supabase
      .from('profile_badges')
      .select('awarded_at,badges(name,description,icon_url)')
      .eq('profile_id', profile.id);

    const badgeBox = document.querySelector('#profile-badges');

    for (const row of badges || []) {
      const badge = document.createElement('span');
      const badgeName = row.badges?.name || 'Badge';

      badge.title = badgeName;
      badge.setAttribute('aria-label', badgeName);
      badge.style.cssText = 'display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(255,255,255,.09);border-radius:8px;background:rgba(255,255,255,.04);color:#d7ff4f;font-size:12px;';

      if (row.badges?.icon_url) {
        const img = document.createElement('img');
        img.src = row.badges.icon_url;
        img.alt = badgeName;
        img.style.cssText = 'width:19px;height:19px;object-fit:contain;';
        badge.appendChild(img);
      } else {
        badge.textContent = '✦';
      }

      badgeBox.appendChild(badge);
    }

    await supabase.rpc('record_profile_view', {
      target_profile: profile.id
    }).catch(() => {});
  }
}
