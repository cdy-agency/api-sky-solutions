import { createTransport } from "nodemailer"
import dotenv from "dotenv"

dotenv.config() 
const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
} as any)

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${token}`
  
  const mailOptions = {
    from: `"SKY Solutions" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify Your Email - SKY Solutions",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4F91 0%, #D4A84B 100%); padding: 30px; text-align: center; color: white; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #1B4F91; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SKY Solutions</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for registering with SKY Solutions. Please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>Or copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>Best regards,<br>SKY Solutions Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SKY Solutions. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export const sendInvestmentNotification = async (email: string, businessName: string, amount: number) => {
  const mailOptions = {
    from: `"SKY Solutions" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Investment Notification - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4F91 0%, #D4A84B 100%); padding: 30px; text-align: center; color: white; }
            .content { background: #f9f9f9; padding: 30px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SKY Solutions</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have successfully invested $${amount} in ${businessName}.</p>
              <p>Best regards,<br>SKY Solutions Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SKY Solutions. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export const sendCustomEmail = async (email: string, name: string, subject: string, message: string) => {
  const mailOptions = {
    from: `"SKY Solutions" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4F91 0%, #D4A84B 100%); padding: 30px; text-align: center; color: white; }
            .content { background: #f9f9f9; padding: 30px; }
            .message { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SKY Solutions</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <div class="message">
                ${message.replace(/\n/g, "<br>")}
              </div>
              <p>Best regards,<br>SKY Solutions Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SKY Solutions. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }

  return transporter.sendMail(mailOptions)
}
