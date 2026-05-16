'use strict';
// One-time script: email the updated Team Playbook PDF to all team members.
// Usage:
//   docker cp NEDS-Drishti-Team-Playbook.pdf agencyos-app-1:/app/NEDS-Drishti-Team-Playbook.pdf
//   docker cp send-playbook.js agencyos-app-1:/app/send-playbook.js
//   docker exec -it agencyos-app-1 node /app/send-playbook.js

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { decrypt, isEncrypted } = require('./server/dist/lib/encryption');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const pdfBuffer = fs.readFileSync(path.join(__dirname, 'NEDS-Drishti-Team-Playbook.pdf'));
  console.log(`Playbook PDF loaded — ${Math.round(pdfBuffer.length / 1024)} KB`);

  try {
    const agencies = await prisma.agency.findMany({
      include: {
        users: {
          where: { role: { not: 'CLIENT' } },
          select: { email: true, name: true },
        },
      },
    });

    for (const agency of agencies) {
      if (!agency.smtpHost || !agency.smtpUser || !agency.smtpPass) {
        console.log(`Skipping "${agency.name}": SMTP not configured.`);
        continue;
      }

      const pass = isEncrypted(agency.smtpPass) ? decrypt(agency.smtpPass) : agency.smtpPass;
      const transport = nodemailer.createTransport({
        host: agency.smtpHost,
        port: 587,
        secure: false,
        auth: { user: agency.smtpUser, pass },
      });

      for (const user of agency.users) {
        await transport.sendMail({
          from: `"${agency.name}" <${agency.smtpUser}>`,
          to: user.email,
          subject: `${agency.name} — Updated Team Playbook (v3)`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111827">
              <div style="background:#1a472a;padding:28px 32px;border-radius:12px 12px 0 0">
                <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">${agency.name}</h1>
                <p style="color:#a7f3d0;margin:6px 0 0;font-size:13px">Team Playbook — Version 3</p>
              </div>
              <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <p style="font-size:15px;margin-bottom:14px">Hi ${user.name},</p>
                <p style="font-size:14px;line-height:1.7;color:#374151;margin-bottom:14px">
                  The updated <strong>NEDS Drishti Team Playbook (v3)</strong> is attached. This version includes:
                </p>
                <ul style="font-size:14px;line-height:1.8;color:#374151;padding-left:20px;margin-bottom:20px">
                  <li><strong>AI Search Visibility Audit</strong> — new GEO tool (Section 4)</li>
                  <li>Updated AI Studio section — now 11 tools</li>
                  <li>Content Studio — updated scheduling and caption workflow notes</li>
                  <li>Action Items — due date workflow clarified</li>
                  <li>Full monthly operating playbook with weekly checklists</li>
                </ul>
                <p style="font-size:13px;color:#6b7280;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px">
                  — <strong>${agency.name}</strong>
                </p>
              </div>
            </div>
          `,
          attachments: [{
            filename: 'NEDS-Drishti-Team-Playbook-v3.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          }],
        });
        console.log(`  ✓ Sent to ${user.name} <${user.email}>`);
      }
    }
    console.log('\nDone.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
