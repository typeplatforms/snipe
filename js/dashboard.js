import { supabase, requireSession, touchActivity } from './supabase.js';

const session = await requireSession();
if (!session) throw new Error('Not authenticated');
await touchActivity();

const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
if (error) throw error;

const $ = id => document.querySelector(`#${id}`);
const initials = (profile.display_name || profile.username || '?').slice(0,1).toUpperCase();
const allowedEffects = new Set(['none','glow','rainbow','shimmer','pulse','fire','ice','neon','shadow','gradient']);
const effect = allowedEffects.has(profile.display_name_effect) ? profile.display_name_effect : 'none';
$('nav-avatar').textContent = initials;
$('avatar').textContent = initials;
$('display-name').textContent = profile.display_name || profile.username;
$('display-name').classList.add(`name-effect-${effect}`);
$('handle').textContent = '@' + profile.username;
$('bio').textContent = profile.bio || 'No bio yet. Add one from Settings.';
$('views').textContent = profile.profile_views ?? 0;
$('joined').textContent = new Date(profile.created_at).toLocaleDateString(undefined, { month:'short', year:'numeric' });

const { count } = await supabase.from('profile_badges').select('*', { count:'exact', head:true }).eq('profile_id', profile.id);
$('badges').textContent = count ?? 0;

const slug = profile.profile_slug || profile.username;
const publicUrl = encodeURIComponent(slug);
const publicPath = `./${publicUrl}`;
$('public-link').href = publicPath;
$('public-link-top').href = publicPath;
$('share-card').href = publicPath;

$('logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace('index.html');
});