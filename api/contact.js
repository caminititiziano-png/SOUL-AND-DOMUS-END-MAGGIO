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

function formatClientAutoresponder(data) {
  const name = textValue(data, "name");
  const greeting = name ? `Dear ${name},` : "Dear Sir or Madam,";

  const text = [
    greeting,
    "",
    "Thank you for contacting Soul & Domus.",
    "",
    "Your private request has been received. There is no obligation at this stage, and there are no hidden clauses attached to this first contact.",
    "",
    "Soul & Domus carefully reviews each request personally. Our responses are not immediate because every request is evaluated seriously and individually, with the calm attention that a private acquisition deserves.",
    "",
    "The team usually replies within 2 working days.",
    "",
    "The Private Room exists precisely to avoid rushed, generic interactions and to create a more considered space for your questions, your timing and your priorities.",
    "",
    "Abbiamo ricevuto la sua richiesta. La leggeremo con attenzione e risponderemo normalmente entro 2 giorni lavorativi.",
    "",
    "With respectful regards,",
    "Soul & Domus"
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#26190f;line-height:1.6;max-width:680px;">
      <p>${escapeHtml(greeting)}</p>
      <p>Thank you for contacting <strong>Soul &amp; Domus</strong>.</p>
      <p>
        Your private request has been received. There is no obligation at this
        stage, and there are no hidden clauses attached to this first contact.
      </p>
      <p>
        Soul &amp; Domus carefully reviews each request personally. Our responses
        are not immediate because every request is evaluated seriously and
        individually, with the calm attention that a private acquisition deserves.
      </p>
      <p>The team usually replies within <strong>2 working days</strong>.</p>
      <p>
        The Private Room exists precisely to avoid rushed, generic interactions
        and to create a more considered space for your questions, your timing and
        your priorities.
      </p>
      <p style="margin-top:24px;">
        <em>Abbiamo ricevuto la sua richiesta. La leggeremo con attenzione e
        risponderemo normalmente entro 2 giorni lavorativi.</em>
      </p>
      <p style="margin-top:24px;">
        With respectful regards,<br />
        <strong>Soul &amp; Domus</strong>
      </p>
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

    const clientEmail = textValue(data, "email");
    const clientAutoresponder = formatClientAutoresponder(data);
    const clientResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [clientEmail],
        subject: "Your Private Request Has Been Received - Soul & Domus",
        text: clientAutoresponder.text,
        html: clientAutoresponder.html
      })
    });

    if (!clientResponse.ok) {
      return res.status(502).json({ error: "Client autoresponder was rejected" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ error: "Email provider is unavailable" });
  }
};
