import { BrevoClient } from '@getbrevo/brevo';

// ─── Client ────────────────────────────────────────────────────────────────────

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

const SENDER = {
  name: process.env.FROM_NAME ?? 'VeoLMS',
  email: process.env.BREVO_SENDER_EMAIL ?? process.env.FROM_EMAIL ?? '',
};

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

// ─── Helper ────────────────────────────────────────────────────────────────────

async function send(to: { email: string; name: string }, subject: string, htmlContent: string): Promise<void> {
  await brevo.transactionalEmails.sendTransacEmail({
    sender: SENDER,
    to: [to],
    subject,
    htmlContent,
  });
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const WRAPPER = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  background: #0f0f0f;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #1e1e1e;
`;

const HEADER_STYLE = `
  background: #111111;
  padding: 28px 32px;
  border-bottom: 1px solid #1e1e1e;
`;

const BODY_STYLE = `padding: 32px;`;

const FOOTER_STYLE = `
  padding: 20px 32px;
  background: #0a0a0a;
  border-top: 1px solid #1e1e1e;
  text-align: center;
  font-size: 12px;
  color: #555;
`;

const ORANGE = '#f97316';

function heading(text: string): string {
  return `<h1 style="margin:0;font-size:24px;font-weight:700;color:${ORANGE};">${text}</h1>`;
}

function p(text: string, color = '#c4c4c4', size = '15px'): string {
  return `<p style="margin:12px 0;color:${color};font-size:${size};line-height:1.6;">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${href}"
         style="display:inline-block;background:${ORANGE};color:#fff;padding:13px 30px;
                border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;
                letter-spacing:0.3px;">
        ${label}
      </a>
    </div>
  `;
}

function otpBox(otp: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:10px;
                   color:#ffffff;background:#1a1a1a;padding:18px 32px;border-radius:10px;
                   border:2px solid #f97316;">
        ${otp}
      </span>
    </div>
  `;
}

function layout(bodyContent: string): string {
  return `
    <div style="${WRAPPER}">
      <div style="${HEADER_STYLE}">
        ${heading('VeoLMS')}
      </div>
      <div style="${BODY_STYLE}">
        ${bodyContent}
      </div>
      <div style="${FOOTER_STYLE}">
        © 2025 VeoLMS. All rights reserved.
      </div>
    </div>
  `;
}

// ─── 1. Welcome Email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: { email: string; firstName: string }): Promise<void> {
  try {
    const html = layout(`
      ${p(`Welcome aboard, <strong style="color:#fff;">${to.firstName}</strong>! 🎉`, '#c4c4c4', '18px')}
      ${p('Your account has been created successfully.')}
      ${p('Start exploring our premium courses today and take the next step in your learning journey.')}
      ${ctaButton('Explore Courses', `${FRONTEND_URL}/courses`)}
    `);

    await send(
      { email: to.email, name: to.firstName },
      `Welcome to VeoLMS, ${to.firstName}! 🎉`,
      html,
    );
  } catch (err) {
    console.error('[EmailService] sendWelcomeEmail failed:', err);
  }
}

// ─── 2. OTP Email ─────────────────────────────────────────────────────────────

export async function sendOtpEmail(
  to: { email: string; firstName: string },
  otp: string,
  type: 'verify' | 'reset',
): Promise<void> {
  try {
    const isVerify = type === 'verify';
    const subject = isVerify ? 'Verify your VeoLMS account' : 'Reset your VeoLMS password';
    const title = isVerify ? 'Please verify your email address' : 'Password reset requested';
    const intro = isVerify
      ? `Hi <strong style="color:#fff;">${to.firstName}</strong>, use the OTP below to verify your account.`
      : `Hi <strong style="color:#fff;">${to.firstName}</strong>, use the OTP below to reset your password.`;

    const html = layout(`
      ${p(title, '#ffffff', '18px')}
      ${p(intro)}
      ${otpBox(otp)}
      ${p('⏳ This OTP expires in <strong>10 minutes</strong>.')}
      ${p("If you didn't request this, you can safely ignore this email.", '#666')}
    `);

    await send({ email: to.email, name: to.firstName }, subject, html);
  } catch (err) {
    console.error('[EmailService] sendOtpEmail failed:', err);
  }
}

// ─── 3. Enrollment Email ──────────────────────────────────────────────────────

export async function sendEnrollmentEmail(
  to: { email: string; firstName: string },
  course: { title: string; slug: string; thumbnail: string },
): Promise<void> {
  try {
    const thumbnailBlock = course.thumbnail
      ? `<div style="margin:20px 0;border-radius:8px;overflow:hidden;">
           <img src="${course.thumbnail}" alt="${course.title}" width="100%"
                style="display:block;border-radius:8px;max-height:200px;object-fit:cover;" />
         </div>`
      : '';

    const html = layout(`
      ${p(`Congratulations, <strong style="color:#fff;">${to.firstName}</strong>! 🎉`, '#c4c4c4', '18px')}
      ${p(`You've successfully enrolled in <strong style="color:${ORANGE};">${course.title}</strong>.`)}
      ${thumbnailBlock}
      ${p("You can start watching your lessons right away. Click below to jump in!")}
      ${ctaButton('Start Learning', `${FRONTEND_URL}/dashboard/learn/${course.slug}`)}
      ${p('Happy learning! — The VeoLMS Team', '#555', '13px')}
    `);

    await send(
      { email: to.email, name: to.firstName },
      `You're enrolled in ${course.title}! 🚀`,
      html,
    );
  } catch (err) {
    console.error('[EmailService] sendEnrollmentEmail failed:', err);
  }
}

// ─── 4. Password Changed Email ────────────────────────────────────────────────

export async function sendPasswordChangedEmail(to: { email: string; firstName: string }): Promise<void> {
  try {
    const changedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

    const html = layout(`
      ${p(`Hi <strong style="color:#fff;">${to.firstName}</strong>,`)}
      ${p('Your VeoLMS password was changed successfully.', '#ffffff', '17px')}
      ${p(`Changed at: <strong style="color:#fff;">${changedAt} IST</strong>`)}
      ${p(
        '⚠️ If this wasn\'t you, please <strong style="color:#f97316;">contact support immediately</strong> and secure your account.',
        '#e57373',
      )}
    `);

    await send(
      { email: to.email, name: to.firstName },
      'Your VeoLMS password was changed',
      html,
    );
  } catch (err) {
    console.error('[EmailService] sendPasswordChangedEmail failed:', err);
  }
}
