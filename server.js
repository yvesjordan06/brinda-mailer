import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const TO_EMAIL = process.env.TO_EMAIL || 'brindanodem@gmail.com';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;

// Origins acceptés : la prod et tout PR Preview Coolify (`<pr_id>.brinda-portfolio...`).
// Surchargeable via env `ALLOWED_ORIGINS` (CSV) ou `ALLOWED_ORIGIN_REGEX` (regex).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://brinda-portfolio.apps.hirodiscount.com')
    .split(',').map(s => s.trim()).filter(Boolean);
const ORIGIN_REGEX = new RegExp(
    process.env.ALLOWED_ORIGIN_REGEX || '^https://([a-z0-9-]+\\.)?brinda-portfolio\\.apps\\.hirodiscount\\.com$'
);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        if (ORIGIN_REGEX.test(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS: ' + origin));
    }
}));
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
          const { name, email, subject, message, hp, token } = req.body || {};
          if (hp) return res.json({ ok: true });
          if (!name || !email || !subject || !message) {
                  return res.status(400).json({ ok: false, error: 'Missing fields' });
          }
          if (message.length > 5000 || subject.length > 200 || name.length > 100 || email.length > 200) {
                  return res.status(400).json({ ok: false, error: 'Field too long' });
          }

          // Vérification Cloudflare Turnstile (anti-bot). Active seulement si le
          // secret est configuré → permet un déploiement progressif sans casse.
          if (TURNSTILE_SECRET) {
                  if (!token) return res.status(400).json({ ok: false, error: 'Captcha manquant' });
                  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                          body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
                  });
                  const outcome = await verify.json().catch(() => ({ success: false }));
                  if (!outcome.success) {
                          return res.status(403).json({ ok: false, error: 'Vérification anti-bot échouée' });
                  }
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
