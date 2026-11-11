// AC Ledger Solutions — Three.js background scenes (one per section)
// Home: floating wireframes | About: team network (photos are hubs)
(function () {
  "use strict";
  if (typeof THREE === "undefined") return; // CDN blocked: site still works without the 3D layer

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NAVY = 0x20244a, GRAY = 0xa5a9b6, BLUE = 0x5a7fe6;
  var scenes = [], raf = 0;
  function isSmall() { return window.innerWidth < 640; }

  function mount(id) {
    var section = document.getElementById(id);
    if (!section) return null;
    var canvas = document.createElement("canvas");
    canvas.className = "three-canvas";
    canvas.setAttribute("aria-hidden", "true");
    section.insertBefore(canvas, section.firstChild);
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isSmall(), powerPreference: "low-power" });
    } catch (e) { canvas.remove(); return null; }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 2));
    var s = {
      section: section, canvas: canvas, renderer: renderer,
      scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, 1, 0.1, 100),
      visible: false, mouse: { x: 0, y: 0 }, update: function () {}, resize: function () {}
    };
    // half visible height at depth z (camera looking down -z)
    s.halfH = function (z) { return Math.tan(25 * Math.PI / 180) * (s.camera.position.z - z); };
    section.addEventListener("pointermove", function (e) {
      var r = section.getBoundingClientRect();
      s.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      s.mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    }, { passive: true });
    scenes.push(s);
    return s;
  }

  function fit(s) {
    var w = s.section.clientWidth, h = s.section.clientHeight;
    if (!w || !h) return;
    s.renderer.setSize(w, h, false);
    s.camera.aspect = w / h;
    s.camera.updateProjectionMatrix();
    s.resize(w, h);
  }
  function draw(s, t) { s.update(t); s.renderer.render(s.scene, s.camera); }

  // ---------- HOME: floating wireframe shapes ----------
  function home() {
    var s = mount("home"); if (!s) return;
    s.camera.position.set(0, 0, 7);
    var g = new THREE.Group(); s.scene.add(g);
    function wire(geo, color, op) {
      return new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: op }));
    }
    var a = wire(new THREE.IcosahedronGeometry(2.2, 1), BLUE, 0.28);
    var b = wire(new THREE.OctahedronGeometry(1.8, 0), GRAY, 0.35);
    var c = wire(new THREE.TorusGeometry(1.1, 0.32, 10, 28), GRAY, 0.25);
    g.add(a, b, c);
    s.resize = function () {
      var sc = s.camera.aspect < 0.9 ? 0.6 : 1, hh = s.halfH(-1), hw = hh * s.camera.aspect;
      a.scale.setScalar(sc); b.scale.setScalar(sc); c.scale.setScalar(sc);
      a.position.set(-hw * 0.78, hh * 0.45, -1);
      b.position.set(hw * 0.78, -hh * 0.4, -1);
      c.position.set(hw * 0.6, hh * 0.65, -2);
    };
    s.update = function (t) {
      a.rotation.set(t * 0.15, t * 0.2, 0);
      b.rotation.set(t * 0.1, -t * 0.25, 0);
      c.rotation.set(t * 0.2, 0, t * 0.15);
      g.position.y = Math.sin(t * 0.5) * 0.2;
      g.rotation.y += (s.mouse.x * 0.3 - g.rotation.y) * 0.04;
      g.rotation.x += (-s.mouse.y * 0.2 - g.rotation.x) * 0.04;
    };
  }

  // ---------- ABOUT: team network (each team photo is a hub; hovering a photo lights it up) ----------
  function about() {
    var s = mount("about"); if (!s) return;
    s.camera.position.set(0, 0, 10);
    var MAX = 90, n = 40, i, j, bx = 8, by = 4, H = 600;
    var nx = new Float32Array(MAX), ny = new Float32Array(MAX), nz = new Float32Array(MAX);
    var vx = new Float32Array(MAX), vy = new Float32Array(MAX), ox = new Float32Array(MAX), oy = new Float32Array(MAX);
    var pos = new Float32Array(MAX * 3);
    for (i = 0; i < MAX; i++) {
      nx[i] = Math.random() * 2 - 1; ny[i] = Math.random() * 2 - 1; nz[i] = (Math.random() - 0.5) * 2;
      vx[i] = (Math.random() - 0.5) * 0.0025; vy[i] = (Math.random() - 0.5) * 0.0025;
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    var pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: NAVY, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.5 }));
    var lp = new Float32Array((MAX * (MAX - 1) / 2) * 6);
    var lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(lp, 3).setUsage(THREE.DynamicDrawUsage));
    var lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: NAVY, transparent: true, opacity: 0.18 }));
    // hub lines (photo -> nearby nodes, photo -> photo), brighter when a photo is hovered
    var HM = 4 * MAX + 8, hp = new Float32Array(HM * 6), hc = new Float32Array(HM * 6);
    var hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.BufferAttribute(hp, 3).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute("color", new THREE.BufferAttribute(hc, 3).setUsage(THREE.DynamicDrawUsage));
    var hubLines = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }));
    s.scene.add(lines, hubLines, pts);
    var dim = new THREE.Color(0x98a3c6), bright = new THREE.Color(0x3556d6);

    // one hub per team photo
    var ringGeo = new THREE.RingGeometry(0.96, 1, 72), hubs = [];
    Array.prototype.forEach.call(s.section.querySelectorAll(".team-photo"), function (el) {
      var m1 = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.3, depthWrite: false });
      var m2 = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0, depthWrite: false });
      var r1 = new THREE.Mesh(ringGeo, m1), r2 = new THREE.Mesh(ringGeo, m2);
      s.scene.add(r1, r2);
      var hub = { el: el, x: 0, y: 0, R: 1, e: 0, t: 0, r1: r1, r2: r2 };
      hubs.push(hub);
      var card = el.closest(".team-card") || el;
      function set(v) { hub.t = v; if (reduce) { hub.e = v; draw(s, 2); } }
      card.addEventListener("pointerenter", function () { set(1); });
      card.addEventListener("pointerleave", function () { set(0); });
    });

    s.resize = function (w, h) {
      H = h; by = s.halfH(0); bx = by * s.camera.aspect;
      n = Math.max(30, Math.min(MAX, Math.round((w * h) / 22000)));
      pg.setDrawRange(0, n);
    };

    var m = 0;
    function seg(ax, ay, az, bx2, by2, bz, e) {
      var k = m * 6, r = dim.r + (bright.r - dim.r) * e, g = dim.g + (bright.g - dim.g) * e, b = dim.b + (bright.b - dim.b) * e;
      hp[k] = ax; hp[k + 1] = ay; hp[k + 2] = az; hp[k + 3] = bx2; hp[k + 4] = by2; hp[k + 5] = bz;
      hc[k] = hc[k + 3] = r; hc[k + 1] = hc[k + 4] = g; hc[k + 2] = hc[k + 5] = b;
      m++;
    }

    s.update = function (t) {
      var sr = s.section.getBoundingClientRect(), W = sr.width || 1, hh = sr.height || 1, u = (2 * by) / hh; // world units per px
      var h, k, d, dx, dy, best, bd, tx, ty, nl = 0, thr = 150 * u, thr2 = thr * thr;

      hubs.forEach(function (hb, idx) {
        var r = hb.el.getBoundingClientRect();
        hb.x = ((r.left - sr.left + r.width / 2) / W - 0.5) * 2 * bx;
        hb.y = -(((r.top - sr.top + r.height / 2) / hh) - 0.5) * 2 * by;
        hb.R = (hb.el.offsetWidth / 2) * u;
        hb.e = reduce ? hb.t : hb.e + (hb.t - hb.e) * 0.08;
        hb.r1.position.set(hb.x, hb.y, 0);
        hb.r1.scale.setScalar(hb.R * (1.24 + 0.08 * hb.e));
        hb.r1.material.opacity = 0.25 + 0.4 * hb.e;
        var ph = (t * 0.7 + idx * 0.25) % 1;
        hb.r2.visible = hb.e > 0.02;
        hb.r2.position.set(hb.x, hb.y, 0);
        hb.r2.scale.setScalar(hb.R * (1.2 + ph * 0.9));
        hb.r2.material.opacity = hb.e * 0.55 * (1 - ph);
      });

      for (i = 0; i < n; i++) {
        nx[i] += vx[i]; ny[i] += vy[i];
        if (nx[i] > 1 || nx[i] < -1) vx[i] *= -1;
        if (ny[i] > 1 || ny[i] < -1) vy[i] *= -1;
        // pull toward the nearest hub that is hovered
        tx = 0; ty = 0; best = null; bd = 1e12;
        for (k = 0; k < hubs.length; k++) {
          dx = hubs[k].x - nx[i] * bx; dy = hubs[k].y - ny[i] * by; d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = hubs[k]; }
        }
        if (best && best.e > 0.01) { tx = (best.x / bx - nx[i]) * 0.3 * best.e; ty = (best.y / by - ny[i]) * 0.3 * best.e; }
        ox[i] += (tx - ox[i]) * 0.06; oy[i] += (ty - oy[i]) * 0.06;
        pos[i * 3] = (nx[i] + ox[i]) * bx; pos[i * 3 + 1] = (ny[i] + oy[i]) * by; pos[i * 3 + 2] = nz[i];
      }
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        dx = pos[i * 3] - pos[j * 3]; dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        if (dx * dx + dy * dy < thr2) {
          k = nl * 6;
          lp[k] = pos[i * 3]; lp[k + 1] = pos[i * 3 + 1]; lp[k + 2] = pos[i * 3 + 2];
          lp[k + 3] = pos[j * 3]; lp[k + 4] = pos[j * 3 + 1]; lp[k + 5] = pos[j * 3 + 2];
          nl++;
        }
      }
      m = 0;
      hubs.forEach(function (hb) {
        var reach = 280 * u * (1 + 0.6 * hb.e), r2 = reach * reach;
        for (i = 0; i < n; i++) {
          dx = hb.x - pos[i * 3]; dy = hb.y - pos[i * 3 + 1];
          if (dx * dx + dy * dy < r2) seg(hb.x, hb.y, 0, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], hb.e);
        }
      });
      for (k = 0; k < hubs.length - 1; k++) seg(hubs[k].x, hubs[k].y, 0, hubs[k + 1].x, hubs[k + 1].y, 0, Math.max(hubs[k].e, hubs[k + 1].e));

      pg.attributes.position.needsUpdate = true;
      lg.attributes.position.needsUpdate = true; lg.setDrawRange(0, nl * 2);
      hg.attributes.position.needsUpdate = true; hg.attributes.color.needsUpdate = true; hg.setDrawRange(0, m * 2);
    };
  }

  // ---------- loop & visibility ----------
  function tick() {
    raf = requestAnimationFrame(tick);
    var t = performance.now() / 1000;
    scenes.forEach(function (s) { if (s.visible) draw(s, t); });
  }
  function sync() {
    var any = scenes.some(function (s) { return s.visible; });
    if (any && !raf && !reduce && !document.hidden) raf = requestAnimationFrame(tick);
    else if ((!any || document.hidden) && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  try { home(); about(); } catch (e) { return; }

  scenes.forEach(function (s) {
    fit(s);
    if (reduce) draw(s, 2);
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { fit(s); if (reduce) draw(s, 2); }).observe(s.section);
    } else {
      window.addEventListener("resize", function () { fit(s); if (reduce) draw(s, 2); });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { s.visible = e[0].isIntersecting; sync(); }, { rootMargin: "100px" }).observe(s.section);
    } else { s.visible = true; }
  });
  document.addEventListener("visibilitychange", sync);
  sync();
})();
