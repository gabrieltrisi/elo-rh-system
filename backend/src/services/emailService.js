import nodemailer from 'nodemailer';
import XLSX from 'xlsx';

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

export const isEmailTransportReady = () => Boolean(transporter);

const buildAccessWorkbookBuffer = ({ employeeName, systems }) => {
  const rows = (systems || []).map((system) => ({
    Colaborador: employeeName || '',
    Sistema: system.systemName || '',
    Usuario: system.username || '',
    Senha_Provisoria: system.temporaryPassword || '',
    Link: system.accessLink || '',
    Observacoes: system.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Acessos');

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });
};

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

export const sendPasswordResetEmail = async ({ to, name, resetLink }) => {
  if (!transporter) {
    throw new Error('Configuração de e-mail não encontrada no ambiente');
  }

  await transporter.sendMail({
    from: `"EloSystem RH" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Redefinição de senha - EloSystem',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Olá, ${name || 'usuário'}!</h2>
        <p>Recebemos uma solicitação para redefinir sua senha de acesso ao EloSystem.</p>
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        <p>
          <a
            href="${resetLink}"
            style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;"
          >
            Redefinir senha
          </a>
        </p>
        <p>Se preferir, você também pode copiar este link:</p>
        <p>${resetLink}</p>
        <p>Este link expira em 30 minutos.</p>
        <p>Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.</p>
      </div>
    `,
  });
};

export const sendSecurityVerificationEmail = async ({
  to,
  name,
  code,
  purpose = 'LOGIN_MFA',
  expiresInMinutes = 10,
}) => {
  if (!transporter) {
    throw new Error('Configuracao de e-mail nao encontrada no ambiente');
  }

  const purposeLabel =
    purpose === 'REAUTH'
      ? 'reautenticacao de seguranca'
      : purpose === 'MFA_SETUP'
        ? 'ativacao da autenticacao em duas etapas'
        : 'verificacao de acesso';

  await transporter.sendMail({
    from: `"EloSystem Seguranca" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Codigo de verificacao - EloSystem',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Ola, ${name || 'usuario'}!</h2>
        <p>Recebemos uma solicitacao de <strong>${purposeLabel}</strong> no EloSystem.</p>
        <p>Use o codigo abaixo para concluir a etapa de seguranca:</p>
        <div style="margin: 24px 0; padding: 18px; border-radius: 16px; background: #0f172a; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.4em; text-align: center;">
          ${code}
        </div>
        <p>Este codigo expira em ${expiresInMinutes} minutos.</p>
        <p>Se voce nao reconhece esta tentativa, ignore este e-mail e avise a administracao.</p>
      </div>
    `,
  });
};

export const sendWelcomeAccessEmail = async ({ to, name, systems = [] }) => {
  if (!transporter) {
    throw new Error('Configuração de e-mail não encontrada no ambiente');
  }

  const workbookBuffer = buildAccessWorkbookBuffer({
    employeeName: name,
    systems,
  });

  await transporter.sendMail({
    from: `"EloSystem RH" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Boas-vindas + Acessos iniciais',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Olá, ${name || 'colaborador'}!</h2>
        <p>Seja bem-vindo(a) à empresa.</p>
        <p>Seu onboarding foi iniciado e seus acessos iniciais já foram preparados.</p>
        <p>Em anexo, você encontrará a planilha com:</p>
        <ul>
          <li>Sistemas</li>
          <li>Usuários</li>
          <li>Senhas provisórias</li>
          <li>Links de acesso</li>
        </ul>
        <p>Recomendamos alterar suas senhas após o primeiro acesso, quando aplicável.</p>
        <p>Qualquer dúvida, entre em contato com o RH ou TI.</p>
      </div>
    `,
    attachments: [
      {
        filename: `acessos-iniciais-${String(name || 'colaborador')
          .toLowerCase()
          .replace(/\s+/g, '-')}.xlsx`,
        content: workbookBuffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });
};
