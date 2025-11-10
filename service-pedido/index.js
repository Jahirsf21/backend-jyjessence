import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authMiddleware from '../shared/middleware/auth.js';
import isAdmin from '../shared/middleware/admin.js';
import PedidoFacade from './facades/pedidoFacade.js';

const app = express();

const allowedOrigins = [
  'https://frontend-jyjessence.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercelPreview = /^https?:\/\/frontend-jyjessence-.*\.vercel\.app$/.test(origin);
    if (allowedOrigins.includes(origin) || isVercelPreview) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());


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
    console.log('🛒 GET /api/carrito - clienteId:', clienteId);
    
    const carrito = await PedidoFacade.verCarrito(clienteId);
    console.log('🛒 Carrito obtenido:', JSON.stringify(carrito, null, 2));
    
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


// Finalizar pedido sin pasarela de pagos (solo crea el pedido con estado "Pendiente")
app.post('/api/pedidos/finalizar', authMiddleware, async (req, res) => {
  try {
    const clienteId = req.user.idCliente;
    const pedido = await PedidoFacade.finalizarPedidoSinPago(clienteId);
    res.status(201).json({ 
      mensaje: 'Pedido creado exitosamente',
      pedido
    });
  } catch (error) {
    console.error('Error al finalizar pedido:', error);
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor de Pedidos escuchando en http://localhost:${PORT}`);
});
