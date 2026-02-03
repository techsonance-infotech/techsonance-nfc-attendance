
import nodemailer from 'nodemailer';

interface WelcomeEmailParams {
    email: string;
    name: string;
    password: string;
    designation?: string;
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
});

export async function sendWelcomeEmail({ email, name, password, designation }: WelcomeEmailParams) {
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
        console.warn('SMTP credentials not found (EMAIL_SERVER_USER/PASSWORD). Skipping email sending.');
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"TechSonance HR" <${process.env.EMAIL_SERVER_USER}>`,
            to: email,
            subject: 'Welcome to TechSonance - Your Login Credentials',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to TechSonance!</h2>
          <p>Dear ${name},</p>
          <p>We are excited to have you on board${designation ? ` as our new ${designation}` : ''}.</p>
          <p>Your account has been created in the attendance system. Please find your login credentials below:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>Please log in and update your profile as needed.</p>
          
          <p>Best regards,<br>TechSonance HR Team</p>
        </div>
      `,
        });

        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
}
