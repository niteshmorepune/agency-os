'use strict';
// One-time script: generate the Platform Guide PDF and email it to all team members.
// Run inside the Docker container:
//   docker exec -it agencyos-app-1 node /app/send-guide.js

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { generateHelpGuidePDF } = require('./server/dist/services/helpGuide.service');
const { decrypt, isEncrypted } = require('./server/dist/lib/encryption');

async function main() {
  const prisma = new PrismaClient();
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

      console.log(`Generating PDF for "${agency.name}"...`);
      const pdfBuffer = await generateHelpGuidePDF();
      console.log(`PDF ready — ${Math.round(pdfBuffer.length / 1024)} KB`);

      for (const user of agency.users) {
        await transport.sendMail({
          from: `"${agency.name}" <${agency.smtpUser}>`,
          to: user.email,
          subject: `${agency.name} — Updated Platform Guide`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111827">
              <div style="background:#1a472a;padding:28px 32px;border-radius:12px 12px 0 0">
                <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">${agency.name}</h1>
                <p style="color:#a7f3d0;margin:6px 0 0;font-size:13px">Platform Guide — Updated</p>
              </div>
              <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <p style="font-size:15px;margin-bottom:14px">Hi ${user.name},</p>
                <p style="font-size:14px;line-height:1.7;color:#374151;margin-bottom:14px">
                  The latest <strong>NEDS Drishti Platform Guide</strong> is attached. It reflects all recent updates:
                </p>
                <ul style="font-size:14px;line-height:1.8;color:#374151;padding-left:20px;margin-bottom:20px">
                  <li>AI Search Visibility Audit tool (GEO)</li>
                  <li>Post scheduling — status now correctly set to Scheduled</li>
                  <li>Caption generator — requires client selection, cleaner numbered output</li>
                  <li>Action Items — due date now saves correctly</li>
                  <li>Client Onboarding link fix</li>
                </ul>
                <p style="font-size:13px;color:#6b7280;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px">
                  Questions? Reply to this email or message us in the platform.<br><br>
                  — <strong>${agency.name}</strong>
                </p>
              </div>
            </div>
          `,
          attachments: [{
            filename: 'NEDS-Drishti-Platform-Guide.pdf',
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

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
