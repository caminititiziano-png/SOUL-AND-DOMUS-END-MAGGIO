const form = document.querySelector("#clientForm");
const formStatus = document.querySelector("#formStatus");
const META_PIXEL_ID = "988766597077072";
const META_CONSENT_KEY = "soul-domus-meta-consent";

function loadMetaPixel() {
  if (window.fbq) {
    window.fbq("consent", "grant");
    return;
  }

  !function(f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("consent", "grant");
  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

function removeMetaCookies() {
  const cookieNames = ["_fbp", "_fbc"];
  const domainParts = window.location.hostname.split(".");
  const domains = ["", window.location.hostname];

  if (domainParts.length > 1) {
    domains.push(`.${domainParts.slice(-2).join(".")}`);
  }

  cookieNames.forEach((name) => {
    domains.forEach((domain) => {
      const domainAttribute = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; Max-Age=0; path=/${domainAttribute}; SameSite=Lax`;
    });
  });
}

function setMetaConsent(value) {
  window.localStorage.setItem(META_CONSENT_KEY, value);

  if (value === "accepted") {
    loadMetaPixel();
    return;
  }

  if (window.fbq) {
    window.fbq("consent", "revoke");
  }

  removeMetaCookies();
}

function buildCookieBanner() {
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.id = "cookieBanner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie preferences");
  banner.innerHTML = `
    <div>
      <strong>Privacy choices</strong>
      <p>
        We use optional Meta Pixel tracking only with your consent to measure
        advertising performance. You can accept or reject it. Essential website
        functions remain available either way. Read our
        <a href="cookie.html">Cookie Notice</a>.
      </p>
    </div>
    <div class="cookie-banner-actions">
      <button type="button" class="btn secondary" data-cookie-reject>Reject</button>
      <button type="button" class="btn primary" data-cookie-accept>Accept</button>
    </div>
  `;

  banner.querySelector("[data-cookie-accept]").addEventListener("click", () => {
    setMetaConsent("accepted");
    banner.hidden = true;
  });

  banner.querySelector("[data-cookie-reject]").addEventListener("click", () => {
    setMetaConsent("rejected");
    banner.hidden = true;
  });

  document.body.appendChild(banner);
  return banner;
}

function initializeCookiePreferences() {
  const banner = buildCookieBanner();
  const choice = window.localStorage.getItem(META_CONSENT_KEY);

  if (choice === "accepted") {
    banner.hidden = true;
    loadMetaPixel();
  } else if (choice === "rejected") {
    banner.hidden = true;
    removeMetaCookies();
  }

  document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      banner.hidden = false;
    });
  });
}

initializeCookiePreferences();

function fieldValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function setStatus(message, isError = false) {
  if (!formStatus) {
    return;
  }

  formStatus.textContent = message;
  formStatus.classList.toggle("error", isError);
}

function buildEmailBody(formData) {
  const lines = [
    "New private acquisition request from the Soul & Domus website",
    "",
    `Name: ${fieldValue(formData, "name")}`,
    `Email: ${fieldValue(formData, "email")}`,
    `Country: ${fieldValue(formData, "country")}`,
    `Phone / WhatsApp: ${fieldValue(formData, "phone")}`,
    "",
    `Need: ${fieldValue(formData, "need")}`,
    `Budget: ${fieldValue(formData, "budget")}`,
    `Family size: ${fieldValue(formData, "family")}`,
    `Preferred region: ${fieldValue(formData, "region")}`,
    `Decision timing: ${fieldValue(formData, "timing")}`,
    `Preferred size: ${fieldValue(formData, "size")}`,
    "",
    "Property link / expectations / notes:",
    fieldValue(formData, "message"),
    "",
    "Privacy consent: yes"
  ];

  return lines.join("\n");
}

function buildPayload(formData) {
  return {
    name: fieldValue(formData, "name"),
    email: fieldValue(formData, "email"),
    country: fieldValue(formData, "country"),
    phone: fieldValue(formData, "phone"),
    need: fieldValue(formData, "need"),
    budget: fieldValue(formData, "budget"),
    family: fieldValue(formData, "family"),
    region: fieldValue(formData, "region"),
    timing: fieldValue(formData, "timing"),
    size: fieldValue(formData, "size"),
    message: fieldValue(formData, "message"),
    body: buildEmailBody(formData),
    privacy: formData.get("privacy") === "on"
  };
}

function openFallbackEmail(formData) {
  const subject = encodeURIComponent("Soul & Domus - Private Acquisition Review");
  const body = encodeURIComponent(buildEmailBody(formData));
  window.location.href = `mailto:hello@soulanddomus.com?subject=${subject}&body=${body}`;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');

    if (fieldValue(formData, "company")) {
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    setStatus("Sending your request...");

    try {
      const response = await fetch(form.action || "/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildPayload(formData))
      });

      if (!response.ok) {
        throw new Error("The request could not be sent.");
      }

      form.reset();
      setStatus("Thank you. Your request has been sent to Soul & Domus.");
    } catch (error) {
      setStatus(
        "The direct form is not available yet. Your email app will open as a backup.",
        true
      );
      openFallbackEmail(formData);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send private request";
      }
    }
  });
}
