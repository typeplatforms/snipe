import { supabase, requireSession, touchActivity } from './supabase.js';

const session = await requireSession();
if (!session) throw new Error('Not authenticated');
await touchActivity();

const $ = id => document.querySelector(`#${id}`);
const fields = ['display_name','bio','discord_url','github_url','youtube_url','twitter_url','instagram_url','tiktok_url'];
const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
if (error) throw error;

$('username').value = profile.username || '';
for (const key of fields) $(key).value = profile[key] || '';
$('nav-avatar').textContent = (profile.display_name || profile.username || '?').slice(0,1).toUpperCase();
$('public-nav').href = `profile.html?u=${encodeURIComponent(profile.username)}`;

const changesUsed = Number(profile.username_change_count || 0);
const changesLeft = Math.max(0, 2 - changesUsed);
$('username-limit').textContent = `${changesLeft} username change${changesLeft === 1 ? '' : 's'} remaining`;
if (changesLeft === 0) $('username').disabled = true;

$('logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace('index.html');
});

async function uploadMedia(file, kind) {
  if (!file) return null;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error(`${kind} must be a PNG, JPG, or WEBP image.`);
  const max = kind === 'Avatar' ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) throw new Error(`${kind} is too large.`);
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
    if (!/^[A-Za-z0-9_]{3,32}$/.test(requestedUsername)) {
      throw new Error('Username must be 3–32 characters and use only letters, numbers, or underscores.');
    }

    if (requestedUsername.toLowerCase() !== String(profile.username || '').toLowerCase()) {
      const { error: usernameError } = await supabase.rpc('change_username', { new_username: requestedUsername });
      if (usernameError) throw usernameError;
    }

    const updates = {
      display_name: $('display_name').value.trim() || profile.username,
      bio: $('bio').value.trim() || '',
      discord_url: $('discord_url').value.trim() || null,
      github_url: $('github_url').value.trim() || null,
      youtube_url: $('youtube_url').value.trim() || null,
      twitter_url: $('twitter_url').value.trim() || null,
      instagram_url: $('instagram_url').value.trim() || null,
      tiktok_url: $('tiktok_url').value.trim() || null
    };

    for (const [selector, kind, column] of [
      ['#avatar_file','Avatar','avatar_url'],
      ['#banner_file','Banner','banner_url'],
      ['#background_file','Background','background_url']
    ]) {
      const file = document.querySelector(selector).files[0];
      if (file) updates[column] = await uploadMedia(file, kind);
    }

    const { error: saveError } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
    if (saveError) throw saveError;

    await touchActivity();
    status.textContent = 'Saved successfully.';
    setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    status.textContent = error.message || 'Could not save changes.';
  } finally {
    button.disabled = false;
    button.textContent = 'Save changes';
  }
});