/* Just Good front-end behaviour. No dependencies. */
(function () {
	'use strict';

	var root = document.documentElement;
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* Header border once the page scrolls. */
	var header = document.querySelector('[data-header]');
	var progress = document.querySelector('[data-progress]');
	var article = document.querySelector('.jg-prose');

	function onScroll() {
		var y = window.scrollY || window.pageYOffset;
		if (header) header.classList.toggle('is-scrolled', y > 8);
		if (progress && article) {
			var rect = article.getBoundingClientRect();
			var total = rect.height - window.innerHeight * 0.6;
			var done = Math.min(1, Math.max(0, (-rect.top + window.innerHeight * 0.2) / Math.max(total, 1)));
			progress.style.transform = 'scaleX(' + done.toFixed(4) + ')';
		}
	}
	var ticking = false;
	window.addEventListener('scroll', function () {
		if (!ticking) {
			window.requestAnimationFrame(function () { onScroll(); ticking = false; });
			ticking = true;
		}
	}, { passive: true });
	onScroll();

	/* Overlays: search bar and mobile drawer. */
	function overlay(panelSel, openSel, closeSel, lock) {
		var panel = document.querySelector(panelSel);
		var opener = document.querySelector(openSel);
		if (!panel || !opener) return;
		var closers = panel.querySelectorAll(closeSel);

		function open() {
			panel.hidden = false;
			opener.setAttribute('aria-expanded', 'true');
			if (lock) document.body.classList.add('jg-locked');
			var field = panel.querySelector('input[type="search"]');
			if (field && !lock) field.focus();
			document.addEventListener('keydown', onKey);
		}
		function close() {
			panel.hidden = true;
			opener.setAttribute('aria-expanded', 'false');
			if (lock) document.body.classList.remove('jg-locked');
			document.removeEventListener('keydown', onKey);
			opener.focus();
		}
		function onKey(e) { if (e.key === 'Escape') close(); }

		opener.addEventListener('click', open);
		closers.forEach(function (btn) { btn.addEventListener('click', close); });
		panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { if (lock) document.body.classList.remove('jg-locked'); }); });
	}
	overlay('[data-search]', '[data-search-open]', '[data-search-close]', false);
	overlay('[data-drawer]', '[data-menu-open]', '[data-menu-close]', true);

	/* Horizontal scroller buttons. */
	document.querySelectorAll('[data-scroller]').forEach(function (scroller) {
		var track = scroller.querySelector('[data-scroller-track]');
		var prev = scroller.querySelector('[data-scroller-prev]');
		var next = scroller.querySelector('[data-scroller-next]');
		if (!track || !prev || !next) return;

		function step() {
			var item = track.firstElementChild;
			if (!item) return track.clientWidth * 0.8;
			var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
			return item.getBoundingClientRect().width + gap;
		}
		function update() {
			var max = track.scrollWidth - track.clientWidth - 2;
			prev.disabled = track.scrollLeft <= 2;
			next.disabled = track.scrollLeft >= max;
			scroller.querySelector('.jg-scroller__controls').hidden = max <= 0;
		}
		prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
		next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
		track.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		update();
	});

	/* Section reveals. Content is visible without JS; .js gates the hidden state. */
	var reveals = document.querySelectorAll('.jg-reveal');
	if (reduce || !('IntersectionObserver' in window)) {
		reveals.forEach(function (el) { el.classList.add('is-visible'); });
	} else {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					io.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
		reveals.forEach(function (el) { io.observe(el); });
	}

	root.classList.add('js-ready');
})();
