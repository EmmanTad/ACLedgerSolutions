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
    return {
      x: Math.random() * W, y: init ? Math.random() * H : H + 4, r: Math.random() * 2 + .6,
      v: Math.random() * .25 + .08, a: Math.random() * .4 + .15, b: Math.random() < .3
    };
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

// ===== Enquiry log: sends a copy of each enquiry to the Power Automate flow (-> SharePoint Excel) =====
(function () {
  var form = document.getElementById("enquiry-form");
  if (!form) return;
  form.addEventListener("submit", function () {
    var url = (window.AC_ENQUIRY_WEBHOOK || "").trim();
    if (!url) return;                                           // log switched off
    if (form.elements["_honey"] && form.elements["_honey"].value) return; // looks like a bot
    var data = new URLSearchParams();
    ["name", "email", "phone", "service", "message"].forEach(function (k) {
      var el = form.elements[k];
      data.append(k, el ? el.value.trim() : "");
    });
    data.append("page", location.href);
    try { fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: data }); } catch (e) { }
  });
})();
