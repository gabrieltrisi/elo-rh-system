import app from './app.js';
import prisma from './prisma/client.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  try {
    console.log('Has onboarding delegate:', 'onboarding' in prisma);
    console.log('Type of prisma.onboarding:', typeof prisma.onboarding);
    console.log('Has employee delegate:', 'employee' in prisma);
    console.log('Type of prisma.employee:', typeof prisma.employee);
  } catch (error) {
    console.error('Erro ao validar delegates do Prisma:', error);
  }
});
