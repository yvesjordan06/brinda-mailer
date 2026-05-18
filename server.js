import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://brinda-portfolio.apps.hirodiscount.com';
const TO_EMAIL = process.env.TO_EMAIL || 'brindanodem@gmail.com';

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: '50kb' }));

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/send', async (req, res) => {
    try {
          const { name, email, subject, message, hp } = req.body || {};
          if (hp) return res.json({ ok: true });
          if (!name || !email || !subject || !message) {
                  return res.status(400).json({ ok: false, error: 'Missing fields' });
          }
          if (message.length > 5000 || subject.length > 200 || name.length > 100 || email.length > 200) {
                  return res.status(400).json({ ok: false, error: 'Field too long' });
          }
          await transporter.sendMail({
                  from: process.env.SMTP_USER,
                  to: TO_EMAIL,
                  subject: '[Portfolio] ' + subject,
                  replyTo: email,
                  text: 'De: ' + name + ' <' + email + '>\n\n' + message
          });
          res.json({ ok: true });
    } catch (e) {
          console.error(e);
          res.status(500).json({ ok: false, error: 'Send failed' });
    }
});

app.listen(PORT, () => console.log('mailer listening on ' + PORT));
