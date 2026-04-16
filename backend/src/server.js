import app from './app.js';
import prisma from './prisma/client.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  try {
    const models = Object.keys(prisma).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$')
    );

    console.log('📦 Prisma models disponíveis:', models);
  } catch (err) {
    console.error('Erro ao listar models do Prisma:', err);
  }
});
