import { supabase, requireSession, touchActivity } from './supabase.js';

const session = await requireSession();
if (!session) throw new Error('Not authenticated');
await touchActivity();

const $ = id => document.querySelector(`#${id}`);
const fields = ['display_name','bio','discord_url','github_url','youtube_url','twitter_url','instagram_url','tiktok_url'];
const allowedEffects = new Set(['none','glow','rainbow','shimmer','pulse','fire','ice','neon','shadow','gradient']);
const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
if (error) throw error;

$('username').value = profile.username || '';
for (const key of fields) $(key).value = profile[key] || '';
$('nav-avatar').textContent = (profile.display_name || profile.username || '?').slice(0,1).toUpperCase();
$('public-nav').href = profile.profile_slug ? `/${profile.profile_slug}` : `/${profile.username}`;

let selectedEffect = allowedEffects.has(profile.display_name_effect) ? profile.display_name_effect : 'none';
function updateEffectSelection() {
  document.querySelectorAll('.effect-option').forEach(button => button.classList.toggle('active', button.dataset.effect === selectedEffect));
}
document.querySelectorAll('.effect-option').forEach(button => button.addEventListener('click', () => { selectedEffect = button.dataset.effect; updateEffectSelection(); }));
updateEffectSelection();

function updateUsernameLimit(count) {
  const used = Number(count || 0);
  const left = Math.max(0, 2 - used);
  $('username-limit').textContent = `${left} username change${left === 1 ? '' : 's'} remaining`;
  $('username').disabled = left === 0;
}
updateUsernameLimit(profile.username_change_count);

$('logout').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.replace('index.html'); });

async function uploadMedia(file, kind, maxBytes) {
  if (!file) return null;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error(`${kind} must be a PNG, JPG, or WEBP image.`);
  if (file.size > maxBytes) throw new Error(`${kind} is too large.`);
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${session.user.id}/${kind.toLowerCase()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('snipe-media').upload(path, file, { upsert:false, contentType:file.type, cacheControl:'3600' });
  if (uploadError) throw uploadError;
  return supabase.storage.from('snipe-media').getPublicUrl(path).data.publicUrl;
}

$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('save');
  const status = $('status');
  button.disabled = true;
  button.textContent = 'Saving…';
  status.textContent = '';

  try {
    const requestedUsername = $('username').value.trim();
    const currentUsername = String(profile.username || '');
    if (!/^[A-Za-z0-9_]{3,32}$/.test(requestedUsername)) throw new Error('Username must be 3–32 characters and use only letters, numbers, or underscores.');

    let finalUsername = currentUsername;
    let changesUsed = Number(profile.username_change_count || 0);
    if (requestedUsername.toLowerCase() !== currentUsername.toLowerCase()) {
      const { data: result, error: usernameError } = await supabase.rpc('change_username', { new_username: requestedUsername });
      if (usernameError) throw usernameError;
      finalUsername = result?.username || requestedUsername.toLowerCase();
      changesUsed = Number(result?.changes_used ?? changesUsed + 1);
      updateUsernameLimit(changesUsed);
    }

    const updates = {
      display_name: $('display_name').value.trim() || finalUsername,
      display_name_effect: selectedEffect,
      bio: $('bio').value.trim() || '',
      discord_url: $('discord_url').value.trim() || null,
      github_url: $('github_url').value.trim() || null,
      youtube_url: $('youtube_url').value.trim() || null,
      twitter_url: $('twitter_url').value.trim() || null,
      instagram_url: $('instagram_url').value.trim() || null,
      tiktok_url: $('tiktok_url').value.trim() || null
    };

    for (const [selector, kind, column, maxBytes] of [
      ['#avatar_file','Avatar','avatar_url',5*1024*1024],
      ['#banner_file','Banner','banner_url',8*1024*1024],
      ['#background_file','Background','background_url',8*1024*1024]
    ]) {
      const file = document.querySelector(selector).files[0];
      if (file) updates[column] = await uploadMedia(file, kind, maxBytes);
    }

    // Keep the favicon inside the existing custom_links JSON so no new SQL column is required.
    const currentCustomLinks = profile.custom_links && typeof profile.custom_links === 'object' ? { ...profile.custom_links } : {};
    const faviconFile = $('#favicon_file').files[0];
    if (faviconFile) currentCustomLinks.favicon_url = await uploadMedia(faviconFile, 'Favicon', 2*1024*1024);
    updates.custom_links = currentCustomLinks;

    const { error: saveError } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
    if (saveError) throw saveError;

    await touchActivity();
    $('public-nav').href = profile.profile_slug ? `/${profile.profile_slug}` : `/${finalUsername}`;
    status.textContent = 'Changes saved successfully.';
    setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    console.error(error);
    status.textContent = error?.message || 'Could not save changes.';
  } finally {
    button.disabled = false;
    button.textContent = 'Save changes';
  }
});