import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authMiddleware from '../shared/middleware/auth.js';
import isAdmin from '../shared/middleware/admin.js';
import PedidoFacade from '../service-pedido/facades/pedidoFacade.js';
import { sendOrderConfirmationEmail, sendOrderNotificationEmail, verifyEmailConnection } from '../service-email/emailService.js';

// Configurar dotenv para leer desde la carpeta database/
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../database/.env') });

const app = express();

app.use(express.json());

// Verificar conexión con el servicio de correo de forma asíncrona (no bloquea el inicio)
verifyEmailConnection().catch(error => {
  console.error('⚠️ Error al verificar conexión de email (continuando sin email):', error.message);
});

// ==========================================
// ==   RUTAS DEL CARRITO (AUTENTICADAS)  ==
// ==========================================

app.post('/api/carrito/agregar', authMiddleware, async (req, res) => {
  try {
    const { productoId, cantidad } = req.body;
    const clienteId = req.user.idCliente;

    if (!productoId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const items = await PedidoFacade.agregarAlCarrito(clienteId, productoId, cantidad);
    res.status(200).json({ mensaje: 'Producto agregado al carrito', items });
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    res.status(500).json({ error: error.message || 'Error al agregar al carrito' });
  }
});

app.put('/api/carrito/modificar', authMiddleware, async (req, res) => {
  try {
    const { productoId, cantidad } = req.body;
    const clienteId = req.user.idCliente;

    if (!productoId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const items = await PedidoFacade.modificarCantidad(clienteId, productoId, cantidad);
    res.status(200).json({ mensaje: 'Cantidad modificada', items });
  } catch (error) {
    console.error('Error al modificar cantidad:', error);
    res.status(500).json({ error: error.message || 'Error al modificar cantidad' });
  }
});

app.delete('/api/carrito/eliminar/:productoId', authMiddleware, async (req, res) => {
  try {
    const { productoId } = req.params;
    const clienteId = req.user.idCliente;

    const items = await PedidoFacade.eliminarDelCarrito(clienteId, productoId);
    res.status(200).json({ mensaje: 'Producto eliminado del carrito', items });
  } catch (error) {
    console.error('Error al eliminar del carrito:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar del carrito' });
  }
});

app.get('/api/carrito', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const carrito = await PedidoFacade.verCarrito(clienteId);
    res.status(200).json(carrito);
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

app.post('/api/carrito/deshacer', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const items = await PedidoFacade.deshacerCarrito(clienteId);
    res.status(200).json({ mensaje: 'Acción deshecha', items });
  } catch (error) {
    console.error('Error al deshacer:', error);
    res.status(400).json({ error: error.message || 'Error al deshacer' });
  }
});

app.delete('/api/carrito/limpiar', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const items = await PedidoFacade.limpiarCarrito(clienteId);
    res.status(200).json({ mensaje: 'Carrito limpiado exitosamente', items });
  } catch (error) {
    console.error('Error al limpiar carrito:', error);
    res.status(500).json({ error: error.message || 'Error al limpiar carrito' });
  }
});

app.post('/api/carrito/rehacer', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const items = await PedidoFacade.rehacerCarrito(clienteId);
    res.status(200).json({ mensaje: 'Acción rehecha', items });
  } catch (error) {
    console.error('Error al rehacer:', error);
    res.status(400).json({ error: error.message || 'Error al rehacer' });
  }
});

// ==========================================
// ==   RUTAS DE PEDIDOS (AUTENTICADAS)   ==
// ==========================================

// Finalizar pedido sin pasarela de pago
app.post('/api/pedidos/finalizar', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const { direccionId } = req.body || {};

    if (!direccionId) {
      return res.status(400).json({ error: 'Debe seleccionar una dirección de envío' });
    }

    const pedido = await PedidoFacade.finalizarPedidoSinPago(clienteId, direccionId);
    
    // Enviar correos de confirmación
    try {
      // Obtener detalles completos del pedido para el correo
      const pedidoCompleto = await PedidoFacade.obtenerDetallePedido(pedido.idPedido, clienteId);
      
      // Enviar correo al cliente
      const emailCliente = await sendOrderConfirmationEmail(
        pedidoCompleto.pedido,
        pedidoCompleto.cliente,
        pedidoCompleto.items
      );
      
      // Enviar correo de notificación a la tienda
      const emailTienda = await sendOrderNotificationEmail(
        pedidoCompleto.pedido,
        pedidoCompleto.cliente,
        pedidoCompleto.items
      );
      
    } catch (emailError) {
      console.error('⚠️ Error al enviar correos (pedido creado):', emailError);
      // No fallamos el pedido si los correos no se envían
    }
    
    res.status(201).json({ 
      mensaje: 'Pedido creado exitosamente', 
      pedido
    });
  } catch (error) {
    console.error('Error al finalizar pedido:', error);
    res.status(500).json({ error: error.message || 'Error al finalizar pedido' });
  }
});

// Finalizar pedido como invitado (sin autenticación)
app.post('/api/pedidos/finalizar-invitado', async (req, res) => {
  try {
    const { guestInfo, items } = req.body || {};

    if (!guestInfo || !guestInfo.email || !guestInfo.nombre || !guestInfo.telefono || !guestInfo.direccion) {
      return res.status(400).json({ error: 'Información de invitado incompleta. Se requiere email, nombre, teléfono y dirección' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No hay items en el pedido' });
    }

    const pedido = await PedidoFacade.finalizarPedidoInvitado(guestInfo, items);
    
    // Enviar correos de confirmación
    try {
      // Crear objeto de cliente para el correo
      const clienteData = {
        nombre: guestInfo.nombre,
        apellido: guestInfo.apellido || '',
        email: guestInfo.email,
        telefono: guestInfo.telefono || '',
        direccion: guestInfo.direccion // Mantener objeto para el email
      };
      
      // Enviar correo al cliente
      const emailCliente = await sendOrderConfirmationEmail(
        pedido,
        clienteData,
        items
      );
      
      // Enviar correo de notificación a la tienda
      const emailTienda = await sendOrderNotificationEmail(
        pedido,
        clienteData,
        items
      );
      
    } catch (emailError) {
      console.error('⚠️ Error al enviar correos (pedido invitado creado):', emailError);
      // No fallamos el pedido si los correos no se envían
    }
    
    res.status(201).json({ 
      mensaje: 'Pedido creado exitosamente', 
      pedido
    });
  } catch (error) {
    console.error('Error al finalizar pedido de invitado:', error);
    res.status(500).json({ error: error.message || 'Error al finalizar pedido' });
  }
});

app.get('/api/pedidos/historial', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const pedidos = await PedidoFacade.obtenerHistorialPedidos(clienteId);
    res.status(200).json(pedidos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial de pedidos' });
  }
});

app.get('/api/pedidos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const clienteId = req.user.idCliente;
    
    const pedido = await PedidoFacade.obtenerDetallePedido(id, clienteId);
    res.status(200).json(pedido);
  } catch (error) {
    console.error('Error al obtener detalle de pedido:', error);
    res.status(error.message.includes('permiso') ? 403 : 500).json({ 
      error: error.message || 'Error al obtener detalle de pedido' 
    });
  }
});

// ==========================================
// ==   RUTAS ADMIN DE PEDIDOS            ==
// ==========================================

app.get('/api/pedidos', authMiddleware, isAdmin, async (req, res) => {
  try {
    const pedidos = await PedidoFacade.listarTodosPedidos();
    res.status(200).json(pedidos);
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({ error: 'Error al listar pedidos' });
  }
});

app.put('/api/pedidos/:id/estado', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'Estado no proporcionado' });
    }

    const pedido = await PedidoFacade.actualizarEstadoPedido(id, estado);
    res.status(200).json({ 
      mensaje: 'Estado actualizado exitosamente', 
      pedido 
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar estado' });
  }
});

// Exportar para Vercel
// Handler Vercel-compatible con CORS manual
const handler = async (req, res) => {
  try {
    // Configurar CORS headers manualmente para Vercel
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://jyjessence.vercel.app',
      'https://frontend-jyjessence.vercel.app',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];
    
    const isVercelPreviewFrontend = /^https?:\/\/frontend-jyjessence-.*\.vercel\.app$/.test(origin);
    const isVercelPreviewMain = /^https?:\/\/jyjessence-.*\.vercel\.app$/.test(origin);
    
    if (allowedOrigins.includes(origin) || isVercelPreviewFrontend || isVercelPreviewMain) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Delegar a la app de Express con manejo de errores
    try {
      return await app(req, res);
    } catch (expressError) {
      console.error('Error en Express app:', expressError);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Error interno del servidor',
          details: expressError.message
        });
      }
    }
  } catch (handlerError) {
    console.error('Error en handler principal:', handlerError);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Error interno del servidor (handler)',
        details: handlerError.message
      });
    }
  }
};

export default handler;
