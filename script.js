const form = document.querySelector("#clientForm");
const formStatus = document.querySelector("#formStatus");

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
