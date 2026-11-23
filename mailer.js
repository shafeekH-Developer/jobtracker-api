const nodemailer = require("nodemailer");
const { CODE_MINUTES } = require("./emailCodes");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

const TEXT = {
  verify: {
    subject: "Verify your JobTracker email",
    heading: "Verify your email",
    intro: "Use this code to finish creating your JobTracker account.",
  },
  reset: {
    subject: "Reset your JobTracker password",
    heading: "Reset your password",
    intro: "Use this code to choose a new password for your JobTracker account.",
  },
};

async function sendCodeEmail(to, code, purpose) {
  const copy = TEXT[purpose];

  // Local testing without email: print the code in the terminal instead of sending it.
  if (!process.env.SMTP_HOST && process.env.DEV_LOG_CODES === "true") {
    console.log(`[dev] ${purpose} code for ${to}: ${code}`);
    return;
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.MAIL_FROM) {
    throw new Error("Email is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM are required)");
  }

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="font-size:20px;font-weight:700;color:#4f46e5;margin-bottom:16px">JobTracker</div>
    <h2 style="margin:0 0 8px">${copy.heading}</h2>
    <p style="color:#475569;margin:0 0 20px">${copy.intro}</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center">${code}</div>
    <p style="color:#475569;margin:20px 0 0">This code expires in ${CODE_MINUTES} minutes. If you did not request it, you can ignore this email.</p>
  </div>`;

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: copy.subject,
    text: `${copy.heading}\n\n${copy.intro}\n\nYour code: ${code}\n\nThis code expires in ${CODE_MINUTES} minutes. If you did not request it, ignore this email.`,
    html,
  });
}

module.exports = { sendCodeEmail };
