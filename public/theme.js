/* theme.js - shared theme control, art direction V1 "Terminal".
   Classic external script (no inline code: the portfolio CSP is script-src 'self').
   Include it in <head>, BEFORE the stylesheet and WITHOUT defer / async / type="module", so that
   html[data-theme] is set before first paint. Keep byte-identical in my_website and personal_blog.

   Choices: "dark" (default, whatever the OS says), "light", "system" (follows the OS).
   The choice is stored in localStorage under "theme" (try/catch: the page works without storage).
   The two sites are two origins, so a choice made on one is not shared with the other.

   Behaviour exposed to the footer / pill markup (event delegation, so it also works when the markup
   is rendered later, for example by React):
     [data-set-theme="dark|light|system"]  click -> set that theme; the button gets aria-pressed
     [data-theme-flip] or #theme-flip      click -> switch between dark and light (from the effective theme)
   API: window.cbTheme = { get(), effective(), set(t), flip(), sync() }.
   Preview helper: ?theme=light|dark|system on the URL applies for that page load only (nothing stored). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, KEY = "theme";
  var THEMES = { dark: 1, light: 1, system: 1 };
  var CHROME = { dark: "#0B0D11", light: "#F4F4F1" }; /* --bg of each theme, for <meta name="theme-color"> */

  function stored() { try { var s = localStorage.getItem(KEY); return THEMES[s] ? s : null; } catch (e) { return null; } }
  function queried() {
    try { var q = new URLSearchParams(location.search).get("theme"); return THEMES[q] ? q : null; } catch (e) { return null; }
  }
  function get() { var t = root.getAttribute("data-theme"); return THEMES[t] ? t : "dark"; }
  function effective() {
    var t = get();
    if (t === "system") return window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    return t;
  }

  /* Reflect the current theme in the DOM: aria-pressed on the switch buttons, the browser chrome colour. */
  function sync() {
    var t = get(), i, list = doc.querySelectorAll("[data-set-theme]");
    for (i = 0; i < list.length; i++) list[i].setAttribute("aria-pressed", String(list[i].getAttribute("data-set-theme") === t));
    var metas = doc.querySelectorAll('meta[name="theme-color"]');
    for (i = 0; i < metas.length; i++) { metas[i].removeAttribute("media"); metas[i].setAttribute("content", CHROME[effective()]); }
  }
  function apply(t) { root.setAttribute("data-theme", t); sync(); }
  function set(t) {
    if (!THEMES[t]) return;
    apply(t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
  }
  function flip() { set(effective() === "dark" ? "light" : "dark"); }

  /* 1. Before paint: ?theme= (previews) > saved choice > dark. */
  root.setAttribute("data-theme", queried() || stored() || "dark");

  /* 2. Clicks (delegated). */
  doc.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-set-theme], [data-theme-flip], #theme-flip") : null;
    if (!el) return;
    var t = el.getAttribute("data-set-theme");
    if (t) set(t); else flip();
  });

  /* 3. Keep the markup in sync once it exists and whenever it is rendered again (React, view transitions). */
  var queued = false;
  function queue() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; sync(); }); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", sync); else sync();
  if (window.MutationObserver) new MutationObserver(queue).observe(root, { childList: true, subtree: true });

  /* 4. Another tab changed the choice; the OS scheme changed while on "system". */
  window.addEventListener("storage", function (e) { if (e.key === KEY && THEMES[e.newValue]) apply(e.newValue); });
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: light)");
    var onScheme = function () { if (get() === "system") sync(); };
    if (mq.addEventListener) mq.addEventListener("change", onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }

  window.cbTheme = { get: get, effective: effective, set: set, flip: flip, sync: sync };
})();
