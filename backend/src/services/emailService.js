import nodemailer from 'nodemailer';

const hasEmailConfig =
  Boolean(process.env.EMAIL_USER) && Boolean(process.env.EMAIL_PASS);

const transporter = hasEmailConfig
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

export const sendWelcomeEmail = async ({ to, name }) => {
  if (!transporter) {
    throw new Error('Configuração de e-mail não encontrada no ambiente');
  }

  await transporter.sendMail({
    from: `"EloSystem RH" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Boas-vindas à empresa',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2>Olá, ${name || 'colaborador'}!</h2>
        <p>Seja bem-vindo(a) à empresa.</p>
        <p>Seu processo inicial já foi iniciado no EloSystem.</p>
        <p>Em breve você receberá mais orientações sobre acessos e integração.</p>
      </div>
    `,
  });
};

export const sendAdmissionInviteEmail = async ({
  to,
  employeeName,
  publicLink,
}) => {
  if (!transporter) {
    throw new Error('Configuração de e-mail não encontrada no ambiente');
  }

  await transporter.sendMail({
    from: `"EloSystem RH" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Preencha seu formulário de pré-admissão',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Olá, ${employeeName || 'colaborador'}!</h2>
        <p>Seu processo de pré-admissão foi iniciado.</p>
        <p>Para continuar, preencha seu formulário no link abaixo:</p>
        <p>
          <a
            href="${publicLink}"
            style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;"
          >
            Acessar formulário de pré-admissão
          </a>
        </p>
        <p>Se preferir, você também pode copiar este link:</p>
        <p>${publicLink}</p>
        <p>Após o envio, o RH receberá suas informações automaticamente.</p>
      </div>
    `,
  });
};
