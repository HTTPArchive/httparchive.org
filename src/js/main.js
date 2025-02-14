const nav = document.querySelector('#desktop');
const mobileNav = document.querySelector('nav#mobile');
const hamburger = document.querySelector('.hamburger');

if (mobileNav) {
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      const expanded = hamburger.getAttribute('aria-expanded');
      mobileNav.classList.toggle('active');
      hamburger.ariaExpanded = expanded === 'true' ? 'false' : 'true';
    });
  }

  mobileNav.innerHTML = nav.innerHTML;
}

const closeBtn = document.querySelector('.alert .close');
if (closeBtn) {
  closeBtn.addEventListener('click', (e) => {
    // Remove the alert.
    const parent = e.currentTarget.parentElement;
    parent.parentElement.removeChild(parent);
  });
}
