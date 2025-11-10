import prisma from '../../database/config/prisma.js';

const isAdmin = async (req, res, next) => {
  const idCliente = req.user.idCliente;

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { idCliente },
      select: { role: true } 
    });

    if (cliente && cliente.role === 'ADMIN') {
      next(); 
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
  } catch (error) {
    console.error("Error en middleware de admin:", error);
    res.status(500).json({ error: 'Error de autorización.' });
  }
};

export default isAdmin;