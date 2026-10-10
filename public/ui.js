/* ui.js - small shared behaviours of the V1 "Terminal" markup (optional, but both sites need most of it):
     1. the mobile menu under the pill (Menu button, Escape, outside tap, focus trap and return);
     2. the copy buttons (label "copy" -> "copied" for 1.6 s, and "Copied" announced through one hidden status region);
     3. the current-section dot in the pill (aria-current="location"), portfolio only (hash links);
     4. the hero parallax (max 2.5deg), portfolio only; off on touch, below 768px and with reduced motion.
   Classic external script: put it at the end of <body> or with defer. Keep byte-identical in my_website and
   personal_blog. Everything is delegated or looked up lazily, so it works for static HTML (Astro) and for
   markup that React renders after this script ran. The page renders correctly without it.

   Markup it uses (see README.md):
     .pill__menu[aria-controls="menu"]  +  #menu (carries `hidden` in the HTML)
     .copy  with data-copy="text"  or  data-copy-from="#selector"  or, inside .code, the <pre> of that window;
            its label is .copy__label (or the button itself)
     .pill__links a[href^="#"]  and the sections with the matching ids
     .stage > .frame > .rig      (the hero) */
(function () {
  "use strict";
  var doc = document;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function mq(q) { return !!(window.matchMedia && matchMedia(q).matches); }
  function reduced() { return mq("(prefers-reduced-motion: reduce)"); }
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

  /* ---------- 1. Mobile menu ---------- */
  function menuParts() {
    var btn = $(".pill__menu");
    var menu = btn && doc.getElementById(btn.getAttribute("aria-controls") || "menu");
    return btn && menu ? { btn: btn, menu: menu } : null;
  }
  function openMenu(m) {
    m.menu.hidden = false; m.btn.setAttribute("aria-expanded", "true");
    var first = $("a", m.menu); if (first) first.focus();
  }
  function closeMenu(m, restore) {
    m.menu.hidden = true; m.btn.setAttribute("aria-expanded", "false");
    if (restore) m.btn.focus();
  }
  doc.addEventListener("click", function (e) {
    var m = menuParts(); if (!m) return;
    if (closest(e.target, ".pill__menu") === m.btn) { m.menu.hidden ? openMenu(m) : closeMenu(m, true); return; }
    if (!m.menu.hidden && closest(e.target, "#" + m.menu.id + " a")) closeMenu(m, false);
  });
  doc.addEventListener("keydown", function (e) {
    var m = menuParts(); if (!m || m.menu.hidden) return;
    if (e.key === "Escape") { closeMenu(m, true); return; }
    if (e.key === "Tab") {
      var items = [m.btn].concat($$("a", m.menu)); /* DOM order: the Menu button comes before the menu */
      var i = items.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  doc.addEventListener("pointerdown", function (e) {
    var m = menuParts();
    if (m && !m.menu.hidden && !m.menu.contains(e.target) && !m.btn.contains(e.target)) closeMenu(m, false);
  });
  if (window.matchMedia) {
    var wide = matchMedia("(min-width: 640px)");
    var onWide = function () { var m = menuParts(); if (m && wide.matches && !m.menu.hidden) closeMenu(m, false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide); else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------- 2. Copy buttons ---------- */
  var copyState = typeof WeakMap === "function" ? new WeakMap() : null;
  /* The label flips inside the button, but children of a button are presentational and the button keeps its
     aria-label, so a screen reader would hear nothing. One visually hidden status region, created at start so
     assistive tech has registered it before the first message, carries the announcement (needs .sr-only from base.css). */
  var live = null, liveT = 0, liveC = 0;
  function liveRegion() {
    if (live && doc.documentElement.contains(live)) return live;
    if (!doc.body) return null;
    live = doc.createElement("span");
    live.className = "sr-only"; live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite");
    doc.body.appendChild(live);
    return live;
  }
  function announce(msg) {
    var r = liveRegion(); if (!r) return;
    clearTimeout(liveT); clearTimeout(liveC);
    r.textContent = ""; /* emptied first so a repeated copy is announced again */
    liveT = setTimeout(function () { r.textContent = msg; }, 60);
    liveC = setTimeout(function () { r.textContent = ""; }, 3000);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try {
        var ta = doc.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        doc.body.appendChild(ta); ta.select();
        var ok = doc.execCommand("copy"); doc.body.removeChild(ta);
        ok ? resolve() : reject();
      } catch (err) { reject(err); }
    });
  }
  doc.addEventListener("click", function (e) {
    var btn = closest(e.target, ".copy"); if (!btn) return;
    var text = btn.getAttribute("data-copy");
    if (!text) {
      var from = btn.getAttribute("data-copy-from"), src = from ? $(from) : null;
      if (!src) { var win = closest(btn, ".code"); src = win ? $("pre", win) : null; }
      text = src ? src.textContent : "";
    }
    if (!text) return;
    var label = $(".copy__label", btn) || btn;
    var st = copyState && copyState.get(btn);
    if (!st) { st = { base: label.textContent, t: 0 }; if (copyState) copyState.set(btn, st); }
    copyText(text).then(function () {
      label.textContent = "copied"; announce("Copied"); clearTimeout(st.t);
      st.t = setTimeout(function () { label.textContent = st.base; }, 1600);
    }, function () {});
  });

  /* ---------- 3. Current section in the pill (dot + aria-current) ---------- */
  var spy = { io: null, key: "" };
  function initSpy() {
    var links = $$(".pill__links a[href^='#']");
    var key = links.map(function (a) { return a.getAttribute("href"); }).join("|");
    if (key === spy.key) return;
    if (spy.io) { spy.io.disconnect(); spy.io = null; }
    spy.key = key;
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    spy.io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$(".pill__links a[aria-current]").forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = map[en.target.id]; if (a) a.setAttribute("aria-current", "location");
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) spy.io.observe(s); });
  }

  /* ---------- 4. Hero parallax: lerp 0.08 per frame, paused when the tab is hidden ---------- */
  var par = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, rig: null, inside: false, hidden: false };
  function parOK() { return !reduced() && mq("(pointer: fine) and (min-width: 768px)"); }
  function parFrame() {
    par.raf = 0;
    if (par.hidden || !par.rig) return;
    par.cx += (par.tx - par.cx) * 0.08; par.cy += (par.ty - par.cy) * 0.08;
    par.rig.style.setProperty("--px", par.cx.toFixed(4));
    par.rig.style.setProperty("--py", par.cy.toFixed(4));
    if (Math.abs(par.tx - par.cx) > 0.001 || Math.abs(par.ty - par.cy) > 0.001) par.raf = requestAnimationFrame(parFrame);
    else par.rig.style.willChange = "";
  }
  function parKick() {
    if (par.rig) par.rig.style.willChange = "transform";
    if (!par.raf) par.raf = requestAnimationFrame(parFrame);
  }
  function parReset() { par.inside = false; par.tx = 0; par.ty = 0; parKick(); }
  doc.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    var stage = closest(e.target, ".stage");
    if (!stage) { if (par.inside) parReset(); return; }
    if (!parOK()) return;
    par.rig = $(".rig", stage); if (!par.rig) return;
    par.inside = true;
    var r = stage.getBoundingClientRect();
    par.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    par.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    parKick();
  });
  doc.addEventListener("pointerout", function (e) { if (!e.relatedTarget && par.inside) parReset(); });
  doc.addEventListener("visibilitychange", function () { par.hidden = doc.hidden; if (!par.hidden && par.rig) parKick(); });

  /* ---------- init, and again when markup is rendered later ---------- */
  var queued = false;
  function queue() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; initSpy(); }); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { liveRegion(); initSpy(); });
  else { liveRegion(); initSpy(); }
  if (window.MutationObserver) new MutationObserver(queue).observe(doc.documentElement, { childList: true, subtree: true });
})();
