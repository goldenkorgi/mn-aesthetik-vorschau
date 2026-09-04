(function () {
  var html = document.documentElement;
  html.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation drawer
  var burger = document.querySelector('.burger');
  var drawer = document.querySelector('.drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drawer.setAttribute('data-open', String(!open));
      document.body.style.overflow = open ? '' : 'hidden';
    });
  }

  // Split headlines into words (masked reveal)
  var esc = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  document.querySelectorAll('.split').forEach(function (el) {
    if (el.getAttribute('data-split')) return;
    el.setAttribute('data-split', '1');
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w, i) { return '<span class="w"><span style="transition-delay:' + (i * 0.07).toFixed(2) + 's">' + esc(w) + '</span></span>'; }).join(' ');
  });
  setTimeout(function () { document.querySelectorAll('h1.split').forEach(function (h) { h.classList.add('in'); }); }, 120);

  // Progress line, header compact, sticky bar, floating button, parallax
  var header = document.querySelector('.header');
  var sticky = document.querySelector('.sticky-cta');
  var fab = document.querySelector('.fab');
  var prog = document.createElement('div'); prog.className = 'progress'; document.body.appendChild(prog);
  var px = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var measure = function () {
    return px.map(function (el) { return el.parentElement.getBoundingClientRect(); });
  };
  var applyParallax = function (rects, vh) {
    if (reduce) return;
    px.forEach(function (el, i) {
      var r = rects[i];
      if (r.bottom < -200 || r.top > vh + 200) return;
      var f = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      var off = Math.max(-90, Math.min(90, (r.top + r.height / 2 - vh / 2) * -f));
      el.style.transform = 'translateY(' + off.toFixed(1) + 'px)' + (el.classList.contains('hero__img') ? ' scale(1.08)' : '');
    });
  };
  var onScroll = function () {
    // Lesephase
    var y = window.scrollY || 0;
    var vh = window.innerHeight;
    var h = document.documentElement.scrollHeight - vh;
    var rects = px.length ? measure() : [];
    // Schreibphase
    prog.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (sticky) sticky.classList.toggle('is-visible', y > 140 || sticky.hasAttribute('data-always'));
    if (fab) fab.classList.toggle('is-visible', y > 320);
    applyParallax(rects, vh);
  };
  var scrollTick = false;
  window.addEventListener('scroll', function () { if (!scrollTick) { scrollTick = true; requestAnimationFrame(function () { onScroll(); scrollTick = false; }); } }, { passive: true });
  requestAnimationFrame(onScroll);

  // Scroll reveal (IntersectionObserver + geometric fallback, so nothing can stay hidden)
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-img'));
  var revealIn = function (el) { el.classList.add('in'); };
  if (!revealEls.length || reduce) {
    revealEls.forEach(revealIn);
  } else {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { revealIn(en.target); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealEls.forEach(function (el) { io.observe(el); });
    }
    var checkVisible = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // Lesephase: alle Positionen messen, dann Schreibphase: Klassen setzen
      var pending = revealEls.filter(function (el) { return !el.classList.contains('in'); });
      var rects = pending.map(function (el) { return el.getBoundingClientRect(); });
      var rest = [];
      pending.forEach(function (el, i) {
        var r = rects[i];
        if (r.top < vh * 0.94 && r.bottom > 0) revealIn(el); else rest.push(el);
      });
      revealEls = rest;
    };
    var ticking = false;
    var onMove = function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { checkVisible(); ticking = false; }); } };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    setTimeout(checkVisible, 300);
    setTimeout(checkVisible, 1200);
    window.addEventListener('load', checkVisible);
  }

  // Count-up numbers
  var counters = document.querySelectorAll('[data-count]');
  var fmt = function (n, dec) {
    return dec ? n.toFixed(dec).replace('.', ',') : Math.round(n).toLocaleString('de-DE');
  };
  var runCount = function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = fmt(target, dec) + suffix; return; }
    var start = null, dur = 1400;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased, dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  var pending = Array.prototype.slice.call(counters);
  var startCounter = function (el) { if (el.getAttribute('data-started')) return; el.setAttribute('data-started', '1'); runCount(el); };
  if (pending.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { startCounter(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.3 });
    pending.forEach(function (el) { cio.observe(el); });
  }
  var checkCounters = function () {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) { startCounter(el); return false; }
      return true;
    });
  };
  window.addEventListener('scroll', checkCounters, { passive: true });
  setTimeout(checkCounters, 400);
  setTimeout(checkCounters, 1500);

  // Marquee: duplicate track for seamless loop
  document.querySelectorAll('.marquee__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  // Review strip arrows
  document.querySelectorAll('[data-strip]').forEach(function (wrap) {
    var strip = wrap.querySelector('.strip');
    wrap.querySelectorAll('[data-strip-prev],[data-strip-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = strip.querySelector('.strip > *');
        var w = card ? card.getBoundingClientRect().width + 24 : 320;
        strip.scrollBy({ left: btn.hasAttribute('data-strip-next') ? w : -w, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });

  // Contact form: compose a WhatsApp message (works without backend).
  var form = document.querySelector('form[data-wa-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var lines = [
        'Hallo Frau Peters,',
        '',
        (f.get('anliegen') ? 'Anliegen: ' + f.get('anliegen') : ''),
        (f.get('bereich') ? 'Bereich: ' + f.get('bereich') : ''),
        (f.get('nachricht') ? 'Nachricht: ' + f.get('nachricht') : ''),
        '',
        'Name: ' + (f.get('name') || ''),
        (f.get('telefon') ? 'Telefon: ' + f.get('telefon') : '')
      ].filter(function (l, i, a) { return !(l === '' && a[i - 1] === ''); });
      var url = 'https://wa.me/' + form.getAttribute('data-wa-form') + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
    });
  }

  // Trustindex widget: only on click
  var mount = document.querySelector('.ti-mount[data-ti]');
  if (mount) {
    var load = function () {
      if (mount.getAttribute('data-loaded')) return;
      mount.setAttribute('data-loaded', '1');
      var s = document.createElement('script');
      s.src = 'https://cdn.trustindex.io/loader.js?' + mount.getAttribute('data-ti');
      s.defer = true;
      mount.appendChild(s);
    };
    var btn = document.querySelector('[data-ti-load]');
    if (btn) btn.addEventListener('click', function () { load(); btn.hidden = true; });
  }

  // Conversion events (Plausible / GA4 compatible, no-op if absent)
  document.querySelectorAll('a[href^="https://wa.me"], a[href^="tel:"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var ev = a.href.indexOf('wa.me') > -1 ? 'WhatsApp' : 'Anruf';
      if (window.plausible) window.plausible(ev);
      if (window.gtag) window.gtag('event', ev.toLowerCase(), { event_category: 'conversion' });
    });
  });
})();
