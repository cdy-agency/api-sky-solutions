import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${token}` 

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@skysolutions.com",
    to: email,
    subject: "Verify Your Email - SKY Solutions",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to SKY Solutions!</h1>
        <p style="color: #666;">Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
        <p style="color: #666;">Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    `,
  })
}

export const sendInvestmentNotification = async (
  entrepreneurEmail: string,
  investorName: string,
  businessTitle: string,
  amount: number,
): Promise<void> => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@skysolutions.com",
    to: entrepreneurEmail,
    subject: "New Investment Request - SKY Solutions",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">New Investment Request!</h1>
        <p style="color: #666;">Great news! You have received a new investment request for your business.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Business:</strong> ${businessTitle}</p>
          <p style="margin: 0 0 10px 0;"><strong>Investor:</strong> ${investorName}</p>
          <p style="margin: 0;"><strong>Amount:</strong> $${amount.toLocaleString()}</p>
        </div>
        <p style="color: #666;">Log in to your dashboard to view more details.</p>
      </div>
    `,
  })
}

export default transporter
