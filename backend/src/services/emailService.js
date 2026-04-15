import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendWelcomeEmail = async ({ to, name }) => {
  await transporter.sendMail({
    from: `"EloSystem RH" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Bem-vindo à empresa 🚀',
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Bem-vindo(a), ${name} 👋</h2>
        <p>Seu onboarding já começou.</p>

        <hr/>

        <p><b>Próximos passos:</b></p>
        <ul>
          <li>Receber acessos</li>
          <li>Enviar documentos</li>
          <li>Iniciar integração</li>
        </ul>

        <p>Equipe RH 💼</p>
      </div>
    `,
  });
};
