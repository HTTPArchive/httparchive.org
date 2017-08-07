const nav = document.querySelector('header nav');
const mobileNav = document.querySelector('nav#mobile');
const hamburger = document.querySelector('header .hamburger');

hamburger.addEventListener('click', (e) => {
	mobileNav.classList.toggle('active');
});

mobileNav.innerHTML = nav.innerHTML;
