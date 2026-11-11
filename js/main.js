// AC Ledger Solutions — site interactions
(function () {
  // Mobile menu
  var toggle = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open);
      toggle.querySelector("[data-icon-open]").classList.toggle("hidden", open);
      toggle.querySelector("[data-icon-close]").classList.toggle("hidden", !open);
    });
  }

  // Close mobile menu after tapping a link
  if (menu) menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { if (menu.classList.contains("is-open")) toggle.click(); });
  });

  // Header shadow + back-to-top
  var header = document.getElementById("site-header");
  var top = document.getElementById("back-to-top");
  var onScroll = function () {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 10);
    if (top) top.classList.toggle("is-visible", y > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (top) top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // Scroll reveal
  var items = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-visible"); });
  }
  // Safety net: at the very bottom of the page, make sure nothing is left hidden (e.g. the footer)
  window.addEventListener("scroll", function () {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }, { passive: true });

})();

// ===== Animated Home background (typewriter title + particles) =====
(function () {
  var root = document.querySelector(".ac-scene");
  if (!root) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Typewriter title
  var t = root.querySelector(".ac-title");
  var txt = t.getAttribute("aria-label") || t.textContent.trim();
  t.setAttribute("aria-label", txt);
  t.textContent = "";
  var sp = [], cur = document.createElement("span");
  cur.className = "ac-cur"; cur.setAttribute("aria-hidden", "true");
  txt.split("").forEach(function (ch) {
    var s = document.createElement("span");
    s.className = "ac-ch"; s.setAttribute("aria-hidden", "true");
    s.textContent = ch === " " ? "\u00a0" : ch;
    t.appendChild(s); sp.push(s);
  });
  t.insertBefore(cur, sp[0]);
  var k = 0;
  function typeNext() {
    if (k < sp.length) {
      sp[k].style.visibility = "visible"; k++;
      t.insertBefore(cur, sp[k] || null);
      setTimeout(typeNext, 70 + Math.random() * 60);
    } else {
      setTimeout(function () { cur.style.visibility = "hidden"; cur.style.animation = "none"; }, 3000);
    }
  }
  if (reduce) { sp.forEach(function (e) { e.style.visibility = "visible"; }); cur.style.display = "none"; }
  else setTimeout(typeNext, 1800);

  // Drifting particles
  var cv = root.querySelector("canvas"), ctx = cv.getContext("2d");
  var W, H, P = [], raf = 0, vis = true, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function mk(init) {
    return { x: Math.random() * W, y: init ? Math.random() * H : H + 4, r: Math.random() * 2 + .6,
      v: Math.random() * .25 + .08, a: Math.random() * .4 + .15, b: Math.random() < .3 };
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    P.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = p.b ? "rgba(90,127,230," + p.a + ")" : "rgba(255,255,255," + p.a * .6 + ")";
      ctx.fill();
    });
  }
  function size() {
    var b = root.getBoundingClientRect(); W = b.width; H = b.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P = []; for (var i = 0, n = Math.round(W * H / 22000); i < n; i++) P.push(mk(true));
    if (reduce) draw();
  }
  function step() {
    P.forEach(function (p) { p.y -= p.v; if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; } });
    draw(); raf = requestAnimationFrame(step);
  }
  function run() { if (!reduce && vis && !raf) raf = requestAnimationFrame(step); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  size(); window.addEventListener("resize", size);
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; vis ? run() : stop(); }).observe(root);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : run(); });
  run();
})();

// ===== Contact form: sends in the page (no redirect), shows a thank-you message, optional Excel log =====
(function () {
  var form = document.getElementById("enquiry-form");
  if (!form) return;
  // The recipient is set in ONE place: the form's action in index.html. The AJAX endpoint is derived from it.
  var endpoint = (form.getAttribute("action") || "").replace("formsubmit.co/", "formsubmit.co/ajax/");
  var statusEl = document.getElementById("form-status");
  var btn = form.querySelector('button[type="submit"]');
  var card = document.getElementById("form-card");
  var thanks = document.getElementById("form-thanks");
  var thanksName = document.getElementById("thanks-name");
  var thanksEmail = document.getElementById("thanks-email");
  var again = document.getElementById("thanks-again");
  var loaded = Date.now();
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function say(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = "sm:col-span-2 rounded-lg px-4 py-3 text-sm " +
      (ok ? "bg-primary text-primary-foreground" : "border border-red-200 bg-red-50 text-red-800");
    statusEl.hidden = false;
  }

  // Replace the form with the animated thank-you message
  function showThanks(p) {
    var first = (p.name || "").split(/\s+/)[0];
    thanksName.textContent = first ? ", " + first : "";
    if (p.email) { thanksEmail.textContent = "A confirmation is on its way to " + p.email + "."; thanksEmail.hidden = false; }
    else thanksEmail.hidden = true;
    statusEl.hidden = true;
    form.reset();
    form.hidden = true;
    thanks.hidden = false;
    try { thanks.focus({ preventScroll: true }); } catch (e) { thanks.focus(); }
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  // "Send another message" brings the form back
  if (again) again.addEventListener("click", function () {
    thanks.hidden = true;
    form.hidden = false;
    loaded = Date.now();
    var first = form.querySelector("#name"); if (first) first.focus();
  });

  // Optional: copy of each enquiry to a Power Automate flow -> SharePoint Excel (see docs/SETUP-ENQUIRIES.md)
  function logEnquiry(p) {
    var url = (window.AC_ENQUIRY_WEBHOOK || "").trim();
    if (!url) return;
    var d = new URLSearchParams();
    ["name", "email", "phone", "service", "message"].forEach(function (k) { d.append(k, p[k] || ""); });
    d.append("page", location.href);
    try { fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: d }); } catch (e) {}
  }

  form.addEventListener("submit", function (e) {
    if (!window.fetch || !endpoint) return;           // no JS support: normal form post
    e.preventDefault();
    var payload = {};
    new FormData(form).forEach(function (v, k) { payload[k] = typeof v === "string" ? v.trim() : v; });
    if (payload._honey || Date.now() - loaded < 3000) {  // bot: pretend it worked, send nothing
      showThanks(payload); return;
    }
    delete payload._honey;
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    statusEl.hidden = true;
    // 1) Try the AJAX endpoint and read its answer. 2) If the browser blocks/cannot read that request
    //    (network or CORS error, e.g. page opened from a file), fall back to a plain background post.
    var done = function () { try { logEnquiry(payload); showThanks(payload); } catch (x) { console.error(x); thanks.hidden = false; form.hidden = true; } };
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        var msg = (d && d.message) || "";
        if (d && (d.success === true || d.success === "true")) return done();
        if (/activat/i.test(msg)) return done();          // first-ever submission: FormSubmit emails an activation link
        if (r.ok && !d) return done();
        var err = new Error(msg || "failed"); err.rejected = true; throw err;   // the service answered with a real refusal
      });
    }).catch(function (err) {
      if (err && err.rejected) { console.error("Form not sent:", err.message); throw err; }
      // could not reach / read the AJAX endpoint: send as a normal form post in the background
      var body = new URLSearchParams(); Object.keys(payload).forEach(function (k) { body.append(k, payload[k]); });
      return fetch(form.getAttribute("action"), { method: "POST", mode: "no-cors", body: body }).then(done);
    }).catch(function (err) {
      console.error("Form error:", err);
      say("Sorry, we could not send your request. Please try again, or contact us at charles@acledgers.com or (773) 698-3538.", false);
    }).then(function () {
      btn.disabled = false; btn.textContent = label;
    });
  });
})();
