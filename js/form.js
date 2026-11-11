// ===== Contact form: sends in the page (no redirect), shows a thank-you message, saved to Google Sheets =====
(function () {
  var form = document.getElementById("enquiry-form");
  if (!form) return;
  // Enquiries go to the Google Apps Script web app (window.AC_ENQUIRY_WEBHOOK in index.html): it saves a row in
  // Google Sheets, emails the owner and auto-replies to the visitor.
  var endpoint = (window.AC_ENQUIRY_WEBHOOK || form.getAttribute("action") || "").trim();
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
    if (p.email) {
      thanksEmail.textContent = "We sent a confirmation to ";
      var strong = document.createElement("strong"); strong.textContent = p.email;
      thanksEmail.appendChild(strong); thanksEmail.appendChild(document.createTextNode("."));
      thanksEmail.hidden = false;
    }
    else thanksEmail.hidden = true;
    statusEl.hidden = true;
    form.reset();
    function swap() {
      form.classList.remove("form-leaving");
      form.hidden = true;
      thanks.hidden = false;
      try { thanks.focus({ preventScroll: true }); } catch (e) { thanks.focus(); }
      if (card && card.scrollIntoView) card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      confetti();
    }
    if (reduce) swap();
    else { form.classList.add("form-leaving"); setTimeout(swap, 350); }   // form fades out, then the thank-you plays
  }

  // Small confetti burst over the card
  function confetti() {
    if (reduce || !card) return;
    var colors = ["#5a7fe6", "#20244a", "#8fa9f0", "#f5c451", "#ffffff"];
    var box = document.createElement("div");
    box.className = "confetti"; box.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 36; i++) {
      var c = document.createElement("i");
      var angle = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 150;
      c.style.setProperty("--x", Math.round(Math.cos(angle) * dist) + "px");
      c.style.setProperty("--y", Math.round(Math.sin(angle) * dist - 60) + "px");
      c.style.setProperty("--r", Math.round(Math.random() * 720 - 360) + "deg");
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.15).toFixed(2) + "s";
      box.appendChild(c);
    }
    card.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 2200);
  }

  // "Send another message" brings the form back
  if (again) again.addEventListener("click", function () {
    thanks.hidden = true;
    form.hidden = false;
    form.classList.remove("form-leaving");
    loaded = Date.now();
    var first = form.querySelector("#name"); if (first) first.focus();
  });

  form.addEventListener("submit", function (e) {
    if (!window.fetch || !endpoint) return;           // no JS support: normal form post
    e.preventDefault();
    var payload = {};
    new FormData(form).forEach(function (v, k) { payload[k] = typeof v === "string" ? v.trim() : v; });
    if (payload._honey || Date.now() - loaded < 3000) {  // bot: pretend it worked, send nothing
      showThanks(payload); return;
    }
    delete payload._honey;
    // Join country code + local number into one phone value, e.g. "+63 9171234567"
    var cc = payload.phone_country || ""; delete payload.phone_country;
    payload.phone = (cc + " " + (payload.phone || "").replace(/^0+/, "")).trim();
    var label = btn.textContent;
    btn.disabled = true; btn.classList.add("is-sending"); btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>Sending…';
    statusEl.hidden = true;
    // text/plain keeps this a "simple" request, so the browser lets us read Apps Script's answer and we only
    // show the thank-you once the sheet row has really been saved.
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
      .then(function (r) {
        return r.json().catch(function () { throw new Error("Unreadable answer: set the web app access to Anyone and redeploy"); });
      })
      .then(function (d) {
        if (d && d.ok) return showThanks(payload);
        throw new Error((d && d.error) || "not saved");
      })
      .catch(function (err) {
        console.error("Form error:", err);
        say("Sorry, we could not send your request. Please try again, or contact us at charles@acledgers.com or (773) 698-3538.", false);
      })
      .then(function () { btn.disabled = false; btn.classList.remove("is-sending"); btn.textContent = label; });
  });
})();
