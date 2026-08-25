import crypto from 'crypto';

const auditContextMiddleware = (req, res, next) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const requestId =
    req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();

  req.auditContext = {
    requestId: String(requestId),
    ipAddress: Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor || req.ip || req.socket?.remoteAddress || '').split(',')[0].trim(),
    userAgent: req.headers['user-agent'] || null,
  };

  res.setHeader('x-request-id', req.auditContext.requestId);

  next();
};

export default auditContextMiddleware;
