import nodemailer from 'nodemailer';

export const sendWelcomeEmail = async ({ to, employeeName, filePath }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"RH - Empresa" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Bem-vindo à empresa 🚀',
    html: `
      <h2>Bem-vindo, ${employeeName}!</h2>
      <p>Segue em anexo seus acessos aos sistemas.</p>
      <p>Qualquer dúvida, estamos à disposição.</p>
    `,
    attachments: [
      {
        filename: 'acessos.xlsx',
        path: filePath,
      },
    ],
  });
};
