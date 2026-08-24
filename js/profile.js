import { supabase } from './supabase.js';

const params = new URLSearchParams(location.search);
let requested = params.get('u');

if (!requested) {
  const path = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  const parts = path.split('/').filter(Boolean);
  requested = parts.length ? parts[parts.length - 1] : null;
}

const reserved = new Set(['index.html','profile.html','login.html','signup.html','dashboard.html','settings.html','forgot-password.html','reset-password.html','404.html','assets','js','css','snipe']);
if (requested && reserved.has(requested.toLowerCase())) requested = null;

const nameEl = document.querySelector('#profile-name');
const bioEl = document.querySelector('#profile-bio');
const pageEl = document.querySelector('#profile-page');
const bannerEl = document.querySelector('#profile-banner');
const allowedEffects = new Set(['none','glow','rainbow','shimmer','pulse','fire','ice','neon','shadow','gradient']);

function safeImage(url) { try { return new URL(url, location.href).href; } catch { return ''; } }

function applyNameEffect(element, effect) {
  for (const name of allowedEffects) element.classList.remove(`name-effect-${name}`);
  const cleanEffect = allowedEffects.has(effect) ? effect : 'none';
  element.classList.add(`name-effect-${cleanEffect}`);
}

if (!requested) {
  nameEl.textContent = 'Profile not found';
  bioEl.textContent = 'No profile link was provided.';
} else {
  const slugResult = await supabase.from('profiles').select('*').ilike('profile_slug', requested).maybeSingle();
  let profile = slugResult.data;
  if (!profile) {
    const fallback = await supabase.from('profiles').select('*').ilike('username', requested).maybeSingle();
    profile = fallback.data;
  }

  if (!profile) {
    nameEl.textContent = 'Profile not found';
    bioEl.textContent = 'This Snipe profile does not exist.';
  } else {
    document.title = `${profile.display_name || profile.username} — Snipe`;
    nameEl.textContent = profile.display_name || profile.username;
    applyNameEffect(nameEl, profile.display_name_effect);
    document.querySelector('#profile-username').textContent = `@${profile.username}`;

    if (profile.background_url) { const bg = safeImage(profile.background_url); if (bg) pageEl.style.backgroundImage = `url("${bg.replaceAll('"','%22')}")`; }
    if (profile.banner_url) { const banner = safeImage(profile.banner_url); if (banner) bannerEl.style.backgroundImage = `url("${banner.replaceAll('"','%22')}")`; }
    else bannerEl.style.backgroundImage = 'linear-gradient(135deg,#191d22,#090b0f 58%,#161a20)';

    const avatar = document.querySelector('#profile-avatar');
    avatar.replaceChildren();
    if (profile.avatar_url) {
      const src = safeImage(profile.avatar_url);
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `${profile.display_name || profile.username} avatar`;
        img.loading = 'eager';
        img.decoding = 'async';
        img.draggable = false;
        avatar.appendChild(img);
      } else avatar.textContent = (profile.display_name || profile.username).slice(0, 1).toUpperCase();
    } else avatar.textContent = (profile.display_name || profile.username).slice(0, 1).toUpperCase();

    bioEl.textContent = profile.bio || '';
    document.querySelector('#views').textContent = `${profile.profile_views ?? 0} views`;

    const socials = [['Discord',profile.discord_url],['GitHub',profile.github_url],['YouTube',profile.youtube_url],['Twitter / X',profile.twitter_url],['Instagram',profile.instagram_url],['TikTok',profile.tiktok_url]];
    const links = document.querySelector('#links');
    links.replaceChildren();
    for (const [name,url] of socials) {
      if (!url) continue;
      const a = document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=name;
      a.style.cssText='display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border:1px solid rgba(255,255,255,.09);border-radius:10px;color:#c9ccd3;background:rgba(255,255,255,.025);font-size:12px;font-weight:600;box-sizing:border-box;';
      links.appendChild(a);
    }

    const { data: badges } = await supabase.from('profile_badges').select('awarded_at,badges(name,description,icon_url)').eq('profile_id', profile.id);
    const badgeBox = document.querySelector('#profile-badges');
    badgeBox.replaceChildren();
    for (const row of badges || []) {
      if (!row.badges) continue;
      const badge = document.createElement('span'); badge.className='profile-badge';
      const badgeName=row.badges.name||'Badge'; badge.tabIndex=0; badge.setAttribute('aria-label',badgeName);
      if (row.badges.icon_url) { const img=document.createElement('img'); img.src=row.badges.icon_url; img.alt=''; img.loading='lazy'; img.decoding='async'; img.draggable=false; badge.appendChild(img); }
      else badge.appendChild(document.createTextNode('✦'));
      const tooltip=document.createElement('span'); tooltip.textContent=badgeName; badge.appendChild(tooltip); badgeBox.appendChild(badge);
    }

    await supabase.rpc('record_profile_view',{target_profile:profile.id}).catch(()=>{});
  }
}