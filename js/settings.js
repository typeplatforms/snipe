import { supabase, requireSession, touchActivity } from './supabase.js';

const session = await requireSession();
if (!session) throw new Error('Not authenticated');
await touchActivity();

const fields = ['username','display_name','bio','discord_url','github_url','youtube_url','twitter_url','instagram_url','tiktok_url'];
const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
if (error) throw error;

for (const key of fields) document.querySelector(`#${key}`).value = profile[key] || '';
document.querySelector('#nav-avatar').textContent = (profile.display_name || profile.username || '?').slice(0, 1).toUpperCase();
document.querySelector('#public-nav').href = `profile.html?u=${encodeURIComponent(profile.username)}`;

document.querySelector('#logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace('index.html');
});

async function uploadMedia(file, kind) {
  if (!file) return null;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(`${kind} must be a PNG, JPG, or WEBP image.`);
  const max = kind === 'Avatar' ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) throw new Error(`${kind} is too large.`);
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${session.user.id}/${kind.toLowerCase()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('snipe-media').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('snipe-media').getPublicUrl(path);
  return data.publicUrl;
}

document.querySelector('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#save');
  const status = document.querySelector('#status');
  button.disabled = true;
  button.textContent = 'Saving…';
  status.textContent = '';

  try {
    const updates = {
      display_name: document.querySelector('#display_name').value.trim() || null,
      bio: document.querySelector('#bio').value.trim() || null,
      discord_url: document.querySelector('#discord_url').value.trim() || null,
      github_url: document.querySelector('#github_url').value.trim() || null,
      youtube_url: document.querySelector('#youtube_url').value.trim() || null,
      twitter_url: document.querySelector('#twitter_url').value.trim() || null,
      instagram_url: document.querySelector('#instagram_url').value.trim() || null,
      tiktok_url: document.querySelector('#tiktok_url').value.trim() || null
    };

    const media = [
      ['#avatar_file', 'Avatar', 'avatar_url'],
      ['#banner_file', 'Banner', 'banner_url'],
      ['#background_file', 'Background', 'background_url']
    ];
    for (const [selector, kind, column] of media) {
      const file = document.querySelector(selector).files[0];
      if (file) updates[column] = await uploadMedia(file, kind);
    }

    const { error: saveError } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
    if (saveError) throw saveError;
    await touchActivity();
    status.textContent = 'Saved successfully.';
    document.querySelectorAll('input[type=file]').forEach(input => { input.value = ''; });
  } catch (error) {
    status.textContent = error.message || 'Could not save changes.';
  } finally {
    button.disabled = false;
    button.textContent = 'Save changes';
  }
});