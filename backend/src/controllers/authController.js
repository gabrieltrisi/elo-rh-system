import prisma from '../prisma/client.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 🔥 REGISTER
export const register = async (req, res) => {
  const { name, email, password, companyId, role } = req.body;

  try {
    // verifica se usuário já existe
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    // verifica empresa
    const companyExists = await prisma.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!companyExists) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // hash senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // cria usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'ADMIN',
        companyId: Number(companyId),
      },
    });

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        companyId: newUser.companyId,
      },
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(500).json({
      message: 'Erro no servidor',
      error: error.message,
    });
  }
};

// 🔥 LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // busca usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // valida senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Senha inválida' });
    }

    // gera token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      process.env.JWT_SECRET || 'minha_chave_secreta',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || null,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({
      message: 'Erro no servidor',
      error: error.message,
    });
  }
};
