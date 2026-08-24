import { supabase } from './supabase.js';

const form = document.querySelector('#reset-form');
const emailField = document.querySelector('#email-field');
const passwordField = document.querySelector('#password-field');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const button = document.querySelector('#send');
const message = document.querySelector('#message');
const title = document.querySelector('#title');
const subtitle = document.querySelector('#subtitle');
const show = (text, type='') => { message.textContent = text; message.className = `auth-message show ${type}`; };

let recoveryMode = false;
supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'PASSWORD_RECOVERY') {
    recoveryMode = true;
    emailField.hidden = true;
    email.required = false;
    passwordField.hidden = false;
    password.required = true;
    title.textContent = 'Choose a new password.';
    subtitle.textContent = 'Use at least 8 characters for your new Snipe password.';
    button.textContent = 'Update password';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = recoveryMode ? 'Updating…' : 'Sending…';
  try {
    if (recoveryMode) {
      const { error } = await supabase.auth.updateUser({ password: password.value });
      if (error) throw error;
      show('Your password has been updated. You can log in now.', 'success');
      setTimeout(() => window.location.replace('dashboard.html'), 1200);
      return;
    }
    const redirectTo = `${window.location.origin}${window.location.pathname.replace('reset-password.html', '')}reset-password.html`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo });
    if (error) throw error;
    show('If an account uses that email, a password reset link has been sent.', 'success');
    form.reset();
  } catch (error) {
    show(error.message || 'Could not complete password recovery.', 'error');
  } finally {
    button.disabled = false;
    if (!recoveryMode) button.textContent = 'Send reset link';
  }
});