import { supabase } from './supabase.js';

const form = document.querySelector('#reset-form');
const email = document.querySelector('#email');
const button = document.querySelector('#send');
const message = document.querySelector('#message');
const show = (text, type='') => { message.textContent = text; message.className = `auth-message show ${type}`; };

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = 'Sending…';
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname.replace('reset-password.html','') }reset-password.html`
    });
    if (error) throw error;
    show('If an account uses that email, a password reset link has been sent.', 'success');
    form.reset();
  } catch (error) {
    show(error.message || 'Could not send the reset email.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Send reset link';
  }
});