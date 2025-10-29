import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // Use App Password for Gmail
  },
});

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @param {string} verificationLink - Verification link
 */
export const sendVerificationEmail = async (email, name, verificationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email - EcoHealth 🌱",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🌱 EcoHealth</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Welcome to EcoHealth, ${name}!</h2>
          <p style="color: #666; font-size: 16px;">Thank you for joining our community dedicated to sustainable living.</p>
          
          <p style="color: #666; font-size: 16px;">Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
              Verify Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">Or copy this link:</p>
          <p style="background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666;">
            ${verificationLink}
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            <strong>Link expires in 24 hours.</strong><br>
            If you didn't create this account, please ignore this email.
          </p>
        </div>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #999;">
          <p>© 2025 EcoHealth. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    throw error;
  }
};

/**
 * Send welcome email after email verification
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to EcoHealth! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🌱 EcoHealth</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Welcome to EcoHealth! 🎉</h2>
          <p style="color: #666; font-size: 16px;">Hi ${name},</p>
          
          <p style="color: #666; font-size: 16px;">Your email has been verified successfully! Your account is now fully activated.</p>
          
          <h3 style="color: #333;">Get Started:</h3>
          <ul style="color: #666; font-size: 16px;">
            <li>Complete your profile with your lifestyle information</li>
            <li>Calculate your carbon footprint</li>
            <li>Take on eco-friendly challenges</li>
            <li>Earn eco points and badges</li>
            <li>Track your environmental impact</li>
          </ul>
          
          <p style="color: #666; font-size: 16px;">Let's work together to make our planet greener! 🌍</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            If you have any questions, feel free to contact our support team.
          </p>
        </div>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #999;">
          <p>© 2025 EcoHealth. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};

/**
 * Send resend verification email
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @param {string} verificationLink - Verification link
 */
export const sendResendVerificationEmail = async (
  email,
  name,
  verificationLink
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Resend: Verify Your Email - EcoHealth 🌱",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🌱 EcoHealth</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
          <p style="color: #666; font-size: 16px;">Hi ${name},</p>
          
          <p style="color: #666; font-size: 16px;">Here's a fresh verification link for your EcoHealth account:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
              Verify Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">This link expires in 24 hours.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #999;">
          <p>© 2025 EcoHealth. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Resend verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending resend verification email:", error);
    throw error;
  }
};
