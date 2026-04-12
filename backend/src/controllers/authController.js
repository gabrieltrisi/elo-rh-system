import prisma from '../prisma/client.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 🔥 BOOTSTRAP INICIAL DO SISTEMA
export const bootstrapAdmin = async (req, res) => {
  const { companyName, cnpj, name, email, password } = req.body;

  try {
    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        message: 'companyName, name, email e password são obrigatórios',
      });
    }

    const existingCompany = await prisma.company.findFirst();
    const existingUser = await prisma.user.findFirst();

    if (existingCompany || existingUser) {
      return res.status(400).json({
        message: 'Sistema já foi inicializado. Bootstrap não permitido.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          cnpj: cnpj || null,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          companyId: company.id,
        },
      });

      return { company, user };
    });

    return res.status(201).json({
      message: 'Sistema inicializado com sucesso',
      company: {
        id: result.company.id,
        name: result.company.name,
        cnpj: result.company.cnpj,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.companyId,
      },
    });
  } catch (error) {
    console.error('BOOTSTRAP ERROR:', error);
    return res.status(500).json({
      message: 'Erro no servidor',
      error: error.message,
    });
  }
};

// 🔥 REGISTER
export const register = async (req, res) => {
  const { name, email, password, companyId, role } = req.body;

  try {
    if (!name || !email || !password || !companyId) {
      return res.status(400).json({
        message: 'name, email, password e companyId são obrigatórios',
      });
    }

    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const companyExists = await prisma.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!companyExists) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
    if (!email || !password) {
      return res.status(400).json({
        message: 'E-mail e senha são obrigatórios',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Senha inválida' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET não configurado no servidor',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      process.env.JWT_SECRET,
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
