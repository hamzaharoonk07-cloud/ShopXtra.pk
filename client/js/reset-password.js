const resetToken = new URLSearchParams(window.location.search).get('token');
const form = document.getElementById('reset-password-form');

if (!resetToken) {
  form.classList.add('d-none');
  document.getElementById('reset-password-no-token').classList.remove('d-none');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('reset-password-message');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: document.getElementById('reset-password-input').value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    msg.textContent = `${body.message} Redirecting…`;
    msg.style.color = 'var(--tea-pink)';
    msg.classList.remove('d-none');
    form.querySelector('input').value = '';
    setTimeout(() => { window.location.href = '/pages/account.html'; }, 1800);
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = '#b3413a';
    msg.classList.remove('d-none');
    btn.disabled = false;
  }
});
