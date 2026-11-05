const menu = document.getElementById('menu');
const nav = document.getElementById('nav');
if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? '×' : '☰';
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = '☰';
  }));
}
const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', () => {
  document.getElementById('message').textContent = 'Welcome to HisabMate — next, we will build your working dashboard.';
});
