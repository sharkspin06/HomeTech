// Page behaviour: menu, text size, checkers, scam info cards, WhatsApp booking, card tilt.
(function () {
  "use strict";

  var config = window.HOMETECH_CONFIG || {};
  var checkers = window.HomeTechCheckers;

  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- mobile menu ----------
  var navToggle = $(".nav-toggle");
  var navList = $("#nav-list");
  navToggle.addEventListener("click", function () {
    var open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navList.classList.toggle("open", !open);
  });
  navList.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navToggle.setAttribute("aria-expanded", "false");
      navList.classList.remove("open");
    }
  });

  // ---------- text size (remembered on this device only) ----------
  var sizeButtons = document.querySelectorAll(".text-size button");
  function setSize(size) {
    document.documentElement.style.setProperty("--text-scale", size);
    sizeButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.size === size)); });
    try { localStorage.setItem("hometech-text-size", size); } catch (e) { /* storage unavailable */ }
  }
  sizeButtons.forEach(function (b) {
    b.addEventListener("click", function () { setSize(b.dataset.size); });
  });
  try {
    var saved = localStorage.getItem("hometech-text-size");
    if (saved) setSize(saved);
  } catch (e) { /* storage unavailable */ }

  // ---------- result rendering ----------
  var LEVELS = {
    high: {
      label: "High risk: this looks like a scam",
      icon: "⛔",
      advice: "Do not click, pay or reply. Delete the message and block the sender. If you already shared details or paid, call your bank now, then call 1799."
    },
    medium: {
      label: "Be careful: warning signs found",
      icon: "⚠️",
      advice: "Don't act on this message yet. Contact the organisation using a phone number or app you already trust, not the one in the message. Or call 1799 to ask."
    },
    low: {
      label: "Low risk: no common warning signs found",
      icon: "✅",
      advice: "We didn't find common scam signs, but scammers keep changing tricks. If anything asks for money, an OTP or personal details, stop and check with 1799."
    }
  };

  var SEVERITY_ICON = { high: "⛔", medium: "⚠️", info: "ℹ️", good: "✅" };

  function renderResult(el, level, findings, extraNote) {
    var l = LEVELS[level];
    var html =
      '<div class="result-banner result-' + level + '">' +
        '<span class="result-icon" aria-hidden="true">' + l.icon + "</span>" +
        "<div><h3>" + esc(l.label) + "</h3><p>" + esc(l.advice) + "</p></div>" +
      "</div>";

    if (extraNote) {
      html += '<div class="notice notice-warn">' + extraNote + "</div>";
    }

    if (findings.length) {
      html += '<h4 class="findings-title">What we found</h4><ul class="findings">';
      findings.forEach(function (f) {
        html +=
          '<li class="finding finding-' + f.severity + '">' +
            '<span class="finding-icon" aria-hidden="true">' + SEVERITY_ICON[f.severity] + "</span>" +
            "<div><strong>" + esc(f.title) + "</strong><p>" + esc(f.detail) + "</p></div>" +
          "</li>";
      });
      html += "</ul>";
    }

    html +=
      '<div class="result-actions">' +
        '<a class="btn btn-secondary" href="tel:1799">Call ScamShield 1799</a>' +
        '<a class="btn btn-ghost" href="#home-visit">Get help at home</a>' +
      "</div>";

    el.innerHTML = html;
    el.hidden = false;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function renderError(el, message) {
    el.innerHTML = '<p class="form-error">' + esc(message) + "</p>";
    el.hidden = false;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // ---------- message checker ----------
  var msgInput = $("#message-input");
  var msgResult = $("#message-result");

  $("#message-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = msgInput.value.trim();
    if (text.length < 5) {
      renderError(msgResult, "Please paste the message you want to check.");
      return;
    }
    var res = checkers.analyseMessage(text);
    var note = res.containsCode
      ? "<strong>Your message has a 6-digit number.</strong> If this is an OTP, never share it with anyone, even if they say they are from a bank or the government."
      : "";
    renderResult(msgResult, res.level, res.findings, note);
  });
  $("#message-clear").addEventListener("click", function () {
    msgInput.value = "";
    msgResult.hidden = true;
    msgInput.focus();
  });
  $("#message-example").addEventListener("click", function () {
    msgInput.value = "SingPost: Your parcel could not be delivered due to incomplete address. Please pay $1.99 redelivery fee within 24 hours or it will be returned: http://singpost-redelivery.top/sg";
    msgInput.focus();
  });

  // ---------- link checker ----------
  var linkInput = $("#link-input");
  var linkResult = $("#link-result");

  $("#link-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var res = checkers.analyseLink(linkInput.value);
    if (!res.ok) {
      renderError(linkResult, res.error);
      return;
    }
    var note = "Website name: <strong class=\"mono\">" + esc(res.host) + "</strong>";
    renderResult(linkResult, res.level, res.findings, note);
  });
  $("#link-clear").addEventListener("click", function () {
    linkInput.value = "";
    linkResult.hidden = true;
    linkInput.focus();
  });
  $("#link-example").addEventListener("click", function () {
    linkInput.value = "http://dbs-sg-secure-login.top/verify";
    linkInput.focus();
  });

  // ---------- scam info cards ----------
  var grid = $("#scam-grid");
  grid.innerHTML = (window.SCAM_TYPES || []).map(function (s) {
    return (
      '<details class="scam-card tilt-card">' +
        "<summary>" +
          '<span class="scam-icon" aria-hidden="true">' + s.icon + "</span>" +
          '<span class="scam-heading"><strong>' + esc(s.title) + "</strong><span>" + esc(s.summary) + "</span></span>" +
          '<span class="scam-chevron" aria-hidden="true"></span>' +
        "</summary>" +
        '<div class="scam-body">' +
          "<h4>Warning signs</h4><ul>" +
            s.signs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul>" +
          '<p class="scam-action"><strong>What to do:</strong> ' + esc(s.action) + "</p>" +
        "</div>" +
      "</details>"
    );
  }).join("");

  // ---------- WhatsApp booking ----------
  function whatsappUrl(text) {
    return "https://wa.me/" + config.whatsappNumber + "?text=" + encodeURIComponent(text);
  }

  $("#wa-float").href = whatsappUrl(config.bookingGreeting);
  $("#wa-float").target = "_blank";
  $("#wa-float").rel = "noopener noreferrer";

  $("#visit-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#visit-name").value.trim();
    var area = $("#visit-area").value.trim();
    var err = $("#visit-error");
    if (!name || !area) {
      err.textContent = "Please fill in your name and area.";
      err.hidden = false;
      (name ? $("#visit-area") : $("#visit-name")).focus();
      return;
    }
    err.hidden = true;
    var text = [
      config.bookingGreeting,
      "",
      "Name: " + name,
      "Area: " + area,
      "Help needed: " + $("#visit-help").value,
      "Preferred time: " + $("#visit-time").value
    ].join("\n");
    window.open(whatsappUrl(text), "_blank", "noopener");
  });

  // ---------- 3D tilt on cards (pointer devices only) ----------
  if (!prefersReducedMotion() && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".tilt-card");
      if (!card || card.open) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
      card.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
    });
    document.addEventListener("pointerout", function (e) {
      var card = e.target.closest && e.target.closest(".tilt-card");
      if (card && !card.contains(e.relatedTarget)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
    });
  }
})();
