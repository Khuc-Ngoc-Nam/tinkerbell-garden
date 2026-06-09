const db = require('../config/db');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function writeOutbox({ to, subject, html, status, providerMessageId = null, errorMessage = null }) {
  await db.query(
    `INSERT INTO EmailOutbox (RecipientEmail, Subject, HtmlBody, Status, ProviderMessageID, ErrorMessage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [to, subject, html, status, providerMessageId, errorMessage],
  );
}

async function sendTransactionalEmail({ to, subject, html }) {
  if (!nodemailer || !hasSmtpConfig()) {
    await writeOutbox({ to, subject, html, status: 'PendingConfiguration' });
    return { sent: false, status: 'PendingConfiguration' };
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    await writeOutbox({
      to,
      subject,
      html,
      status: 'Sent',
      providerMessageId: info.messageId || null,
    });
    return { sent: true, status: 'Sent', providerMessageId: info.messageId };
  } catch (error) {
    await writeOutbox({
      to,
      subject,
      html,
      status: 'Failed',
      errorMessage: error.message,
    });
    throw error;
  }
}

module.exports = {
  sendTransactionalEmail,
};
