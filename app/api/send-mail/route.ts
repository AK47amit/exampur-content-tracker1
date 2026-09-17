import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { officialEmail, recoveryEmail, isReset } = body;

    console.log('--- API ROUTE HIT ---');
    console.log('Official Email:', officialEmail);
    console.log('Recovery Email:', recoveryEmail);
    console.log('Is Password Reset:', isReset ? 'YES' : 'NO');

    if (!recoveryEmail || !officialEmail) {
      return NextResponse.json({ error: 'Missing required email fields in request payload.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    let mailOptions;

    if (isReset) {
      // Password Reset Email Template
      mailOptions = {
        from: `"Exampur Content Operations" <${process.env.SMTP_EMAIL}>`,
        to: recoveryEmail,
        subject: 'Password Reset Request: Exampur Content Operations',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d1117; color: #ffffff;">
            <div style="background-color: #161b22; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; border: 1px solid #30363d;">
              <h2 style="color: #ff5722; margin-top: 0;">Password Reset Security</h2>
              <p style="color: #c9d1d9; font-size: 16px;">Hello,</p>
              <p style="color: #c9d1d9; font-size: 16px;">We received a password reset request for your official Exampur ID: <strong style="color: #58a6ff;">${officialEmail}</strong>.</p>
              
              <p style="color: #c9d1d9; font-size: 16px;">Click the secure button below to establish a brand new password for your account:</p>
              
              <a href="https://exampur-content-tracker1.vercel.app/reset-password?email=${encodeURIComponent(officialEmail)}" style="display: inline-block; background-color: #ff5722; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">Reset Your Password</a>
              
              <p style="color: #8b949e; font-size: 13px; margin-top: 25px;">If you did not request this password change, please ignore this email or contact your manager immediately.</p>
            </div>
          </div>
        `,
      };
    } else {
      // Standard Account Creation / Welcome Email Template
      mailOptions = {
        from: `"Exampur Content Operations" <${process.env.SMTP_EMAIL}>`,
        to: recoveryEmail,
        subject: 'Account Created: Exampur Content Operations',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d1117; color: #ffffff;">
            <div style="background-color: #161b22; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; border: 1px solid #30363d;">
              <h2 style="color: #ff5722; margin-top: 0;">Welcome to Exampur Operations</h2>
              <p style="color: #c9d1d9; font-size: 16px;">Hello,</p>
              <p style="color: #c9d1d9; font-size: 16px;">Your employee account has been successfully created.</p>
              
              <div style="background-color: #0d1117; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #30363d;">
                <p style="margin: 0; color: #8b949e; font-size: 14px;">Official Exampur ID</p>
                <p style="margin: 5px 0 0 0; color: #58a6ff; font-weight: bold; font-size: 18px;">${officialEmail}</p>
              </div>

              <p style="color: #c9d1d9; font-size: 16px;">You can now securely log in to your dashboard using your official ID.</p>
              
              <a href="https://exampur-content-tracker1.vercel.app/login" style="display: inline-block; background-color: #ff5722; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">Login to Dashboard</a>
            </div>
          </div>
        `,
      };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully response:', info.response);
    return NextResponse.json({ success: true, response: info.response });
  } catch (error: any) {
    console.error('Nodemailer Critical Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error during mail dispatch' }, { status: 500 });
  }
}