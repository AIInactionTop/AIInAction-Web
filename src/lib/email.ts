import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

export async function sendWelcomeEmail(name: string, email: string) {
  const firstName = name?.split(" ")[0] || "there";
  const resend = getResendClient();

  await resend.emails.send({
    from: "AI In Action <noreply@aiinaction.top>",
    to: email,
    subject: "Welcome to AI In Action!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Welcome to AI In Action, ${firstName}!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Thanks for joining our community of AI builders. AI In Action is a hands-on learning platform where you can sharpen your AI skills through real-world challenge projects.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Here's how to get started:
        </p>
        <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Browse challenges across 10 AI categories</li>
          <li>Pick a challenge that matches your skill level</li>
          <li>Build your project and mark it complete to earn XP</li>
          <li>Share your work in the community showcase</li>
        </ul>
        <div style="margin-top: 32px;">
          <a href="https://aiinaction.top/learn/challenges" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
            Explore Challenges
          </a>
        </div>
        <p style="color: #9a9a9a; font-size: 14px; margin-top: 40px;">
          — The AI In Action Team
        </p>
      </div>
    `,
  });
}

export async function sendOtpEmail(email: string, code: string) {
  const resend = getResendClient();

  await resend.emails.send({
    from: "AI In Action <noreply@aiinaction.top>",
    to: email,
    subject: `${code} is your AI In Action verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">Your verification code</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Enter this code to sign in to AI In Action:
        </p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
        </div>
        <p style="color: #9a9a9a; font-size: 14px; line-height: 1.6;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #9a9a9a; font-size: 14px; margin-top: 32px;">
          — The AI In Action Team
        </p>
      </div>
    `,
  });
}
