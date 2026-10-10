/* keys.js - keyboard winks, art direction V1 "Terminal".
   g opens GitHub, b opens the Blog, c goes to Contact. Single-character shortcuts, so WCAG 2.1.4 applies:
     - a visible on/off switch in the footer status bar ("keys: on / off"), the choice kept in localStorage
       ("keys", inside try/catch);
     - the hint and the switch are real text, and the links carry aria-keyshortcuts while the keys are active;
     - the whole control is absent without JS, on touch and below 640px, and the shortcuts are inactive there too;
     - never inside fields, never with a modifier, never on key repeat, never with Caps Lock (e.key is then "G").
   Classic external script: put it at the end of <body> or with defer. Keep byte-identical in my_website and
   personal_blog. Event delegation and a mutation observer make it work when the footer is rendered later (React).

   Markup it uses (see README.md):
     .keys                  group in the footer; carries `hidden` in the HTML, revealed here
     .keys__hint            the "g GitHub · b Blog · c Contact" text; hidden while the keys are off
     [data-keys-set="on|off"]   the two switch buttons (aria-pressed is managed here)
     [data-key-link="g|b"]  the footer links the keys open (aria-keyshortcuts is managed here)
   Site awareness: <html data-site="portfolio"> or <html data-site="blog">.
     portfolio: c scrolls to #contact and focuses its first visible field (or goes to /#contact when the page has none).
     blog:      c goes to https://camilbenameur.com/#contact (override with <html data-contact-url="...">).
   A link to camilbenameur.com or one of its subdomains (the portfolio and the blog) opens in the same tab;
   any other link opens in a new tab with rel noopener.
   API: window.cbKeys = { isOn(), set(bool), sync() }. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, KEY = "keys";
  var CONTACT_URL = "https://camilbenameur.com/#contact";
  var on = true;
  try { if (localStorage.getItem(KEY) === "off") on = false; } catch (e) {}

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function mq(q) { return !!(window.matchMedia && matchMedia(q).matches); }
  function usable() { return mq("(pointer: fine) and (min-width: 640px)"); }
  function reduced() { return mq("(prefers-reduced-motion: reduce)"); }

  function sync() {
    var box = $(".keys");
    if (box) {
      box.hidden = false; /* revealed by JS; CSS still hides it on touch and below 640px */
      var hint = $(".keys__hint", box);
      if (hint) hint.hidden = !on;
      $$("[data-keys-set]", box).forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-keys-set") === (on ? "on" : "off")));
      });
    }
    var active = on && usable();
    $$("[data-key-link]").forEach(function (a) {
      if (active) a.setAttribute("aria-keyshortcuts", a.getAttribute("data-key-link"));
      else a.removeAttribute("aria-keyshortcuts");
    });
  }
  function set(v) {
    on = !!v;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
    sync();
  }

  /* The portfolio and the blog are one site for navigation purposes: moving between them
     stays in the same tab. Local previews (localhost) count as the same site too. */
  function sameSite(url) {
    if (url.origin === location.origin) return true;
    var h = url.hostname;
    return h === "camilbenameur.com" || /\.camilbenameur\.com$/.test(h) ||
      h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  }

  function openLink(a) {
    if (!a || !a.href) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return; }
    if (sameSite(url)) location.assign(url.href);
    else window.open(url.href, "_blank", "noopener");
  }

  /* The first field a visitor can actually type in (skips the honeypot and hidden inputs). */
  function firstField(scope) {
    var explicit = $("[data-key-focus]", scope);
    if (explicit) return explicit;
    var fields = $$("input, textarea, select", scope);
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === "hidden" || f.disabled || f.tabIndex < 0 || f.getAttribute("aria-hidden") === "true") continue;
      if (f.offsetParent === null || (f.closest && f.closest("[aria-hidden='true'], [hidden]"))) continue;
      return f;
    }
    return null;
  }
  function contact() {
    var local = root.getAttribute("data-site") !== "blog" ? doc.getElementById("contact") : null;
    if (!local) { location.assign(root.getAttribute("data-contact-url") || CONTACT_URL); return; }
    var smooth = !reduced();
    local.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    var f = firstField(local);
    if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, smooth ? 450 : 0);
  }

  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-keys-set]") : null;
    if (b) set(b.getAttribute("data-keys-set") === "on");
  });

  doc.addEventListener("keydown", function (e) {
    if (!on || !usable() || !$(".keys")) return;
    if (e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
    if (e.getModifierState && e.getModifierState("CapsLock")) return;
    var el = e.target;
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
    var k = e.key;
    if (k === "g") openLink($("[data-key-link='g']"));
    else if (k === "b") openLink($("[data-key-link='b']"));
    else if (k === "c") contact();
  });

  /* Keep the markup in sync once it exists, when it is rendered again, and when the pointer or width class changes. */
  var queued = false;
  function queue() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; sync(); }); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", sync); else sync();
  if (window.MutationObserver) new MutationObserver(queue).observe(root, { childList: true, subtree: true });
  window.addEventListener("resize", queue);

  window.cbKeys = { isOn: function () { return on; }, set: set, sync: sync };
})();
