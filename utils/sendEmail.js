const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.NODE_EMAIL?.trim(),
      pass: process.env.NODE_PASSWORD?.trim(),
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // 2) Define the email options
  const mailOptions = {
    from: `SkillSwap <${process.env.NODE_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
