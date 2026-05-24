const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "hello@soulanddomus.com";
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "Soul & Domus Website <website@soulanddomus.com>";

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function textValue(data, key) {
  return String(data[key] || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRequest(data) {
  const rows = [
    ["Name", textValue(data, "name")],
    ["Email", textValue(data, "email")],
    ["Country", textValue(data, "country")],
    ["Phone / WhatsApp", textValue(data, "phone")],
    ["Need", textValue(data, "need")],
    ["Budget", textValue(data, "budget")],
    ["Family size", textValue(data, "family")],
    ["Preferred region", textValue(data, "region")],
    ["Decision timing", textValue(data, "timing")],
    ["Preferred size", textValue(data, "size")],
    ["Message", textValue(data, "message")],
    ["Privacy consent", data.privacy ? "yes" : "no"]
  ];

  const text = [
    "New private acquisition request from the Soul & Domus website",
    "",
    ...rows.map(([label, value]) => `${label}: ${value || "-"}`)
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(
          label
        )}</th><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(
          value || "-"
        )}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#26190f;">
      <h2>New private acquisition request</h2>
      <p>Received from the Soul &amp; Domus website.</p>
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;max-width:720px;">
        ${htmlRows}
      </table>
    </div>
  `;

  return { text, html };
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Email service is not configured" });
  }

  let data;
  try {
    data = await readBody(req);
  } catch (error) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  if (!textValue(data, "name") || !isEmail(data.email) || !data.privacy) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { text, html } = formatRequest(data);
  const payload = {
    from: CONTACT_FROM_EMAIL,
    to: [CONTACT_TO_EMAIL],
    reply_to: textValue(data, "email"),
    subject: "Soul & Domus - Private Acquisition Review",
    text,
    html
  };

  if (process.env.CONTACT_BCC_EMAIL) {
    payload.bcc = [process.env.CONTACT_BCC_EMAIL];
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Email provider rejected the request" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ error: "Email provider is unavailable" });
  }
};
