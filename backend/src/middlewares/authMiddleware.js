import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não fornecido',
    });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({
      message: 'Token mal formatado',
    });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({
      message: 'Token mal formatado',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'minha_chave_secreta'
    );

    const companyId =
      decoded.companyId !== undefined && decoded.companyId !== null
        ? Number(decoded.companyId)
        : null;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId,
    };

    if (!req.user.companyId) {
      return res.status(401).json({
        message: 'Token sem companyId válido',
      });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token inválido ou expirado',
    });
  }
};

export default authMiddleware;
