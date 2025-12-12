const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' });

    let transporter;
    // prefer a single SMTP_URL env if provided
    if (process.env.SMTP_URL) {
      transporter = nodemailer.createTransport({ url: process.env.SMTP_URL });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    }

    if (!transporter) {
      // fallback: log to console (vercel logs) and save to /tmp
      console.warn('No SMTP configured — logging contact payload.');
      console.log({ name, email, subject, message });
      // try to write to /tmp/contact.log (ephemeral on serverless)
      try {
        const fs = require('fs');
        const path = require('path');
        const log = `--- CONTACT ${new Date().toISOString()} ---\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}\n\n`;
        const tmpFile = path.join('/tmp', 'contact.log');
        fs.appendFileSync(tmpFile, log);
      } catch (e) {
        // ignore
      }
      return res.status(200).json({ ok: true, message: 'Received (no SMTP configured)' });
    }

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'space3darte@gmail.com',
      to: process.env.TO_EMAIL || 'space3darte@gmail.com',
      subject: subject || `Contact - ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`
    });
    return res.status(200).json({ ok: true, info });
  } catch (err) {
    console.error('Serverless contact error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Unknown error' });
  }
};
