/* Halconfilm — interacciones */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Transición entre páginas ---------- */
  var wipe = $('.wipe');
  var KEY = 'hf-wipe';

  function startHero() {
    if (root.classList.contains('is-ready')) return;
    var go = function () { requestAnimationFrame(function () { root.classList.add('is-ready'); }); };
    if (document.fonts && document.fonts.ready) {
      var done = false;
      var once = function () { if (!done) { done = true; go(); } };
      document.fonts.ready.then(once);
      setTimeout(once, 700);
    } else { go(); }
  }

  function revealPage() {
    if (root.classList.contains('is-entering') && wipe) {
      wipe.classList.add('is-out');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { root.classList.remove('is-entering'); });
      });
      setTimeout(startHero, 280);
      setTimeout(function () { wipe.classList.remove('is-out'); }, 950);
    } else {
      startHero();
    }
  }

  function isInternalPageLink(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel):/i.test(href)) return false;
    if (a.origin !== location.origin) return false;
    // mismo documento con ancla: deja el scroll suave
    if (a.pathname === location.pathname && a.hash) return false;
    if (a.pathname === location.pathname && !a.hash) return false;
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!wipe || reduceMotion || !isInternalPageLink(a, e)) return;
    e.preventDefault();
    try { sessionStorage.setItem(KEY, '1'); } catch (err) { /* sin almacenamiento */ }
    closeMenu();
    wipe.classList.add('is-in');
    setTimeout(function () { window.location.href = a.href; }, 640);
  });

  // al volver con el botón "atrás" desde la caché del navegador
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && wipe) {
      wipe.classList.remove('is-in');
      root.classList.remove('is-entering');
      root.classList.add('is-ready');
    }
  });

  /* ---------- Cabecera ---------- */
  var header = $('.site-header');
  var lastY = window.scrollY;
  var ticking = false;
  var waFloat = $('.wa-float');

  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-solid', y > 24 || !$('.hero'));
      var menuOpen = root.classList.contains('menu-open');
      header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY + 4);
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    if (waFloat) waFloat.classList.toggle('is-visible', y > window.innerHeight * 0.6);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var menuBtn = $('.menu-btn');
  var mobileMenu = $('.mobile-menu');

  function openMenu() {
    root.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Cerrar menú');
    mobileMenu.removeAttribute('inert');
    var first = $('a', mobileMenu);
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 200);
  }
  function closeMenu() {
    if (!menuBtn || !root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
    mobileMenu.setAttribute('inert', '');
  }
  if (menuBtn && mobileMenu) {
    mobileMenu.setAttribute('inert', '');
    menuBtn.addEventListener('click', function () {
      root.classList.contains('menu-open') ? closeMenu() : openMenu();
    });
    $$('a', mobileMenu).forEach(function (a) {
      a.addEventListener('click', function () {
        if (a.getAttribute('href').charAt(0) === '#') closeMenu();
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { closeMenu(); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeMenu(); });
  }

  /* ---------- Antes / después ---------- */
  $$('.compare').forEach(function (box) {
    var range = $('input[type="range"]', box);
    var dragging = false;

    function set(pct) {
      pct = Math.max(0, Math.min(100, pct));
      box.style.setProperty('--pos', pct + '%');
      if (range) range.value = Math.round(pct);
    }
    function fromEvent(e) {
      var r = box.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    }
    box.addEventListener('pointerdown', function (e) {
      if (e.target === range) return;
      dragging = true;
      box.classList.add('is-dragging');
      box.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    box.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      box.addEventListener(t, function () { dragging = false; box.classList.remove('is-dragging'); });
    });
    if (range) range.addEventListener('input', function () { set(+range.value); });

    // pequeño gesto la primera vez que aparece en pantalla, para que se entienda que se puede arrastrar
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var start = null;
        var from = 50;
        var anim = function (t) {
          if (dragging) return;
          if (!start) start = t;
          var p = Math.min(1, (t - start) / 1600);
          var v = from + Math.sin(p * Math.PI * 2) * -18 * (1 - p);
          set(v);
          if (p < 1) requestAnimationFrame(anim);
        };
        setTimeout(function () { requestAnimationFrame(anim); }, 300);
      }, { threshold: 0.6 });
      io.observe(box);
    }
  });

  /* ---------- Visor de fotos ---------- */
  var lb = $('.lightbox');
  if (lb && typeof lb.showModal === 'function') {
    var lbImg = $('.lightbox__img', lb);
    var lbTitle = $('.lightbox__caption strong', lb);
    var lbTag = $('.lightbox__caption span', lb);
    var lbCount = $('.lightbox__count', lb);
    var items = [];
    var index = 0;
    var opener = null;

    function visibleItems() {
      return $$('[data-full]').filter(function (b) { return !b.closest('.is-hidden'); });
    }
    function show(i, instant) {
      index = (i + items.length) % items.length;
      var b = items[index];
      var apply = function () {
        lbImg.src = b.getAttribute('data-full');
        lbImg.alt = b.querySelector('img').alt;
        lbTitle.textContent = b.getAttribute('data-title') || '';
        lbTag.textContent = b.getAttribute('data-tag') || '';
        lbCount.textContent = (index + 1) + ' de ' + items.length;
        lbImg.classList.remove('is-swapping');
      };
      if (instant) { apply(); return; }
      lbImg.classList.add('is-swapping');
      setTimeout(apply, 180);
    }
    function open(btn) {
      items = visibleItems();
      opener = btn;
      show(items.indexOf(btn), true);
      lb.showModal();
      root.style.overflow = 'hidden';
    }
    lb.addEventListener('close', function () {
      root.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-full]');
      if (b) { e.preventDefault(); open(b); }
    });
    $('.lb-prev', lb).addEventListener('click', function () { show(index - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(index + 1); });
    $('.lb-close', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__stage')) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* ---------- Filtros de la galería ---------- */
  var filters = $$('.filter');
  var tiles = $$('.tile');
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      var cat = f.getAttribute('data-filter');
      filters.forEach(function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
      tiles.forEach(function (t) { t.classList.add('is-fading'); });
      setTimeout(function () {
        tiles.forEach(function (t) {
          var match = cat === 'todos' || t.getAttribute('data-cat') === cat;
          t.classList.toggle('is-hidden', !match);
        });
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            tiles.forEach(function (t) { t.classList.remove('is-fading'); });
          });
        });
      }, reduceMotion ? 0 : 260);
      var live = $('#filter-status');
      if (live) {
        var n = tiles.filter(function (t) { return cat === 'todos' || t.getAttribute('data-cat') === cat; }).length;
        live.textContent = n + (n === 1 ? ' trabajo' : ' trabajos');
      }
    });
  });

  /* ---------- Año del pie ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Arranque ---------- */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revealPage);
  else revealPage();
})();
