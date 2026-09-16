(function () {
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menü (Drawer) + Accordion
  var burger = document.querySelector('.burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Menü öffnen' : 'Menü schließen');
      drawer.setAttribute('data-open', String(!open));
      document.body.style.overflow = open ? '' : 'hidden';
    });
    drawer.querySelectorAll('.drawer__list > li > button').forEach(function (b) {
      b.addEventListener('click', function () {
        var li = b.parentElement; var open = li.getAttribute('data-open') === 'true';
        li.setAttribute('data-open', String(!open)); b.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  // Header-Zustand
  var header = document.querySelector('.header');
  var tick = false;
  var onScroll = function () { if (header) header.classList.toggle('is-scrolled', (window.scrollY || 0) > 24); };
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { onScroll(); tick = false; }); } }, { passive: true });
  requestAnimationFrame(onScroll);

  // Sanftes Einblenden beim Scrollen (mit Fallback, damit nichts verborgen bleibt)
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-img'));
  var show = function (el) { el.classList.add('in'); };
  if (!els.length || reduce) { els.forEach(show); }
  else {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
      els.forEach(function (el) { io.observe(el); });
    }
    var check = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var pending = els.filter(function (el) { return !el.classList.contains('in'); });
      var rects = pending.map(function (el) { return el.getBoundingClientRect(); });
      var rest = [];
      pending.forEach(function (el, i) { if (rects[i].top < vh * 0.95 && rects[i].bottom > 0) show(el); else rest.push(el); });
      els = rest;
    };
    var t2 = false;
    var onMove = function () { if (!t2) { t2 = true; requestAnimationFrame(function () { check(); t2 = false; }); } };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    setTimeout(check, 250); setTimeout(check, 1200); window.addEventListener('load', check);
  }

  // Ereignisse (Plausible-Ziele: Termin, Preisliste, WhatsApp, Anruf)
  var track = function (name, props) { if (window.plausible) window.plausible(name, props ? { props: props } : undefined); };
  document.querySelectorAll('a[href^="https://wa.me"]').forEach(function (a) { a.addEventListener('click', function () { track('WhatsApp', { page: location.pathname }); }); });
  document.querySelectorAll('.sticky a[href$="/termin-vereinbaren/"], .sticky a[href$="/preisliste/"]').forEach(function (a) {
    a.addEventListener('click', function () { track('Sticky', { ziel: /preisliste\/$/.test(a.getAttribute('href')) ? 'Preisliste' : 'Termin', page: location.pathname }); });
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) { a.addEventListener('click', function () { track('Anruf', { page: location.pathname }); }); });

  // Formulare: senden an FORM_ENDPOINT (action) wenn gesetzt, sonst lokal bestätigen
  var send = function (form) {
    var action = form.getAttribute('action');
    if (!action) return Promise.resolve(true);
    var fd = new FormData(form);
    fd.append('seite', location.pathname);
    return fetch(action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok; }).catch(function () { return false; });
  };
  var valid = function (form) {
    var ok = true;
    form.querySelectorAll('[required]').forEach(function (f) {
      var bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value));
      f.style.outline = bad ? '2px solid #B0413E' : ''; if (bad) ok = false;
    });
    return ok;
  };

  // Preislisten-Funnel: E-Mail -> Liste sofort anzeigen -> WhatsApp-Hinweis
  var pl = document.querySelector('form[data-pricelist]');
  if (pl) {
    var opt = pl.querySelector('[data-wa-opt]'); var waField = pl.querySelector('[data-wa-field]');
    if (opt && waField) opt.addEventListener('change', function () { waField.hidden = !opt.checked; });
    pl.addEventListener('submit', function (e) {
      e.preventDefault();
      if (pl.querySelector('[name="website"]').value) return; // Honeypot
      if (!valid(pl)) return;
      var btn = pl.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Einen Moment…';
      send(pl).then(function () {
        pl.setAttribute('data-done', 'true');
        document.querySelector('[data-pricelist-success]').setAttribute('data-show', 'true');
        var list = document.querySelector('[data-pricelist-content]');
        if (list) { list.hidden = false; list.querySelectorAll('.reveal').forEach(show); setTimeout(function () { list.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, 80); }
        try { localStorage.setItem('mp_pricelist', '1'); } catch (err) {}
        track('Preisliste', { whatsapp: opt && opt.checked ? 'ja' : 'nein' });
      });
    });
    try { if (localStorage.getItem('mp_pricelist') === '1') { var list0 = document.querySelector('[data-pricelist-content]'); if (list0) { list0.hidden = false; list0.querySelectorAll('.reveal').forEach(show); } } } catch (err) {}
  }

  // Terminformular
  var tf = document.querySelector('form[data-termin]');
  if (tf) {
    tf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (tf.querySelector('[name="website"]').value) return;
      if (!valid(tf)) return;
      var btn = tf.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Wird gesendet…';
      send(tf).then(function (ok) {
        if (!tf.getAttribute('action')) {
          // Kein Endpunkt konfiguriert: Anfrage als WhatsApp-Nachricht vorbereiten
          var f = new FormData(tf);
          var msg = ['Terminanfrage', 'Name: ' + f.get('name'), 'Kontakt: ' + f.get('kontakt'), 'Anliegen: ' + f.get('anliegen'), f.get('wunschzeit') ? 'Wunschzeit: ' + f.get('wunschzeit') : '', f.get('nachricht') ? 'Nachricht: ' + f.get('nachricht') : ''].filter(Boolean).join('\n');
          var wa = document.querySelector('a[href^="https://wa.me"]');
          var num = wa ? wa.getAttribute('href').match(/wa\.me\/(\d+)/)[1] : '';
          window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
        }
        tf.setAttribute('data-done', 'true');
        document.querySelector('[data-termin-success]').setAttribute('data-show', 'true');
        track('Termin', { anliegen: String(new FormData(tf).get('anliegen') || '') });
      });
    });
  }

  // Trustindex nur auf Klick laden
  var mount = document.querySelector('.ti-mount[data-ti]');
  var tiBtn = document.querySelector('[data-ti-load]');
  if (mount && tiBtn) {
    tiBtn.addEventListener('click', function () {
      if (mount.getAttribute('data-loaded')) return;
      mount.setAttribute('data-loaded', '1');
      var s = document.createElement('script'); s.src = 'https://cdn.trustindex.io/loader.js?' + mount.getAttribute('data-ti'); s.defer = true; mount.appendChild(s);
      tiBtn.hidden = true;
    });
  }

  // Karte / Street View nur auf Klick (Datenschutz)
  document.querySelectorAll('.mapload').forEach(function (box) {
    var frame = box.querySelector('.mapload__frame');
    box.querySelectorAll('[data-map]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lat = box.getAttribute('data-lat'), lng = box.getAttribute('data-lng'), q = encodeURIComponent(box.getAttribute('data-q'));
        var src = btn.getAttribute('data-map') === 'sv'
          ? 'https://maps.google.com/maps?q=&layer=c&cbll=' + lat + ',' + lng + '&cbp=11,0,0,0,0&output=svembed'
          : 'https://maps.google.com/maps?q=' + q + '&z=17&output=embed';
        frame.innerHTML = '<iframe src="' + src + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" title="Google Maps"></iframe>';
        frame.hidden = false; frame.classList.remove('mapload__frame--placeholder');
        var cover = box.querySelector('.mapload__cover'); if (cover) cover.hidden = true;
        if (window.plausible) window.plausible('Karte');
      });
    });
  });

  // 360°-Rundgang erst auf Klick laden
  document.querySelectorAll('[data-tour]').forEach(function (card) {
    var btn = card.querySelector('[data-tour-open]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var media = card.querySelector('.tour__media');
      media.innerHTML = '<iframe src="' + card.getAttribute('data-tour') + '" title="360°-Rundgang durch die Praxis" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
      media.classList.add('is-live');
      btn.hidden = true;
      if (window.plausible) window.plausible('Rundgang');
    });
  });

  // ProvenExpert-Siegel: verzögert laden, damit LCP und Mobile unberührt bleiben
  if (window.MP_PE && !document.documentElement.hasAttribute('data-preview-noindex')) {
    var loadSeal = function () {
      if (window.__peLoaded) return;
      var mobile = window.innerWidth < 1000;
      if (mobile && !window.MP_PE.mobile) return;
      window.__peLoaded = true;
      window.loadProSeal = function () {
        if (!window.provenExpert) return;
        window.provenExpert.proSeal({
          widgetId: window.MP_PE.id, language: 'de-DE', usePageLanguage: false,
          bannerColor: window.MP_PE.color, textColor: '#FFFFFF', showReviews: true, hideDate: true, hideName: false,
          hideOnMobile: !window.MP_PE.mobile, bottom: mobile ? '86px' : '30px', stickyToSide: 'right', googleStars: true, zIndex: '95', displayReviewerLastName: false
        });
      };
      var sc = document.createElement('script'); sc.src = 'https://s.provenexpert.net/seals/proseal-v2.js'; sc.async = true; sc.onload = window.loadProSeal;
      document.body.appendChild(sc);
    };
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1); };
    window.addEventListener('load', function () { setTimeout(function () { idle(loadSeal); }, 2500); });
  }

  // Micro-Videos: erst nahe dem Viewport laden, außerhalb pausieren, bei reduzierter Bewegung nur Poster
  var vids = Array.prototype.slice.call(document.querySelectorAll('video[data-src]'));
  if (vids.length && !reduce && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (!v.getAttribute('src')) { v.setAttribute('src', v.getAttribute('data-src')); v.load(); }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (v.getAttribute('src')) { v.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) { vio.observe(v); });
  }

  // Lange Bewertungen auf sechs Zeilen kürzen, mit „Weiterlesen“ (Masterbriefing 2.4). Text bleibt vollständig im HTML.
  var clampReview = function (p) {
    if (p.hasAttribute('data-clamp') || p.textContent.length < 120) return;
    p.classList.add('is-clamped');
    if (p.scrollHeight <= p.clientHeight + 2) { p.classList.remove('is-clamped'); return; }
    p.setAttribute('data-clamp', '');
    var id = 'rv' + Math.random().toString(36).slice(2, 8); p.id = id;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'review__more';
    b.setAttribute('aria-controls', id); b.setAttribute('aria-expanded', 'false'); b.textContent = 'Weiterlesen';
    b.addEventListener('click', function () {
      var open = p.classList.toggle('is-clamped') === false;
      b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Weniger anzeigen' : 'Weiterlesen';
    });
    p.insertAdjacentElement('afterend', b);
  };
  document.querySelectorAll('.review:not(.is-more) p').forEach(clampReview);

  // Bewertungsseite: zuerst neun Karten, der Rest auf Wunsch. Alle Texte stehen im HTML.
  var moreBtn = document.querySelector('[data-reviews-more]');
  var paged = document.querySelector('.reviews--paged');
  if (moreBtn && paged && paged.querySelector('.is-more')) {
    moreBtn.parentNode.hidden = false;
    moreBtn.addEventListener('click', function () {
      paged.classList.add('is-open');
      moreBtn.setAttribute('aria-expanded', 'true');
      paged.querySelectorAll('.is-more p').forEach(clampReview);
      var first = paged.querySelector('.is-more');
      moreBtn.parentNode.hidden = true;
      if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
      track('Bewertungen', { aktion: 'alle anzeigen' });
    });
  }

  // Sticky-Leiste (Masterbriefing 8): erst zeigen, wenn die Hero-Buttons oberhalb des Bildschirms liegen,
  // und ausblenden, solange der Kontaktabschluss mit denselben Wegen sichtbar ist.
  // Positionsmessung statt reiner Schnittmengen-Ereignisse: robust auch bei Sprüngen (Statusleiste, Anker, Zurück).
  var bar = document.querySelector('.sticky');
  if (bar) {
    // Seiten ohne Hero-Buttons: Schwelle ist der Kurz-gesagt-Kasten bzw. die H1.
    var heroCta = document.querySelector('[data-hero-cta]') || document.querySelector('main .summary') || document.querySelector('main h1');
    var petrol = document.querySelectorAll('.section--petrol');
    var endZone = petrol.length ? petrol[petrol.length - 1] : null;
    var barTick = false;
    var applyBar = function () {
      barTick = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var passedHero = !heroCta || heroCta.getBoundingClientRect().bottom < 0;
      var inEnd = !!endZone && endZone.getBoundingClientRect().top < vh * 0.75;
      var show = passedHero && !inEnd;
      bar.classList.toggle('is-hidden', !show);
      if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    };
    var queueBar = function () { if (!barTick) { barTick = true; requestAnimationFrame(applyBar); } };
    window.addEventListener('scroll', queueBar, { passive: true });
    window.addEventListener('resize', queueBar);
    window.addEventListener('pageshow', queueBar);
    applyBar();
  }
})();
