import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {

  const authHeader = req.headers['authorization'];
  
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }


  try {

    const secretKey = process.env.JWT_SECRET;

    const decodedPayload = jwt.verify(token, secretKey);

    req.user = decodedPayload;

    next();

  } catch (error) {

    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

export default authMiddleware;