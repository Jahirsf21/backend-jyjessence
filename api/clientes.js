import express from 'express';
import cors from 'cors';
import authMiddleware from '../shared/middleware/auth.js';
import isAdmin from '../shared/middleware/admin.js';
import ClientFacade from '../service-clientes/facades/clientFacade.js';

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
    if (allowedOrigins.includes(origin) || isVercelPreview) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Añadir cabecera explícita para credenciales
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
app.use(express.json());

// ==========================================
// ==      RUTAS PÚBLICAS (SIN TOKEN)      ==
// ==========================================

app.get('/api/clientes/consulta-cedula/:cedula', async (req, res) => {
  try {
    const datos = await ClientFacade.consultarCedulaTSE(req.params.cedula);
    if (!datos) {
      return res.status(404).json({ error: 'Cédula no encontrada.' });
    }
    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo consultar la información.' });
  }
});

app.post('/api/clientes/registro', async (req, res) => {
  try {
    const clienteSeguro = await ClientFacade.registrar(req.body);
    res.status(201).json(clienteSeguro);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El correo electrónico o la cédula ya están en uso.' });
    }
    if (error.code === 'CEDULA_INVALIDA') {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error al registrar cliente:", error);
    res.status(500).json({ error: 'No se pudo registrar el cliente.' });
  }
});

app.post('/api/clientes/login', async (req, res) => {
  try {
    const resultado = await ClientFacade.autenticar(req.body.email, req.body.contrasena);
    if (!resultado) return res.status(401).json({ error: 'Credenciales inválidas.' });
    res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
});

// =========================================================
// == RUTAS PROTEGIDAS PARA USUARIOS AUTENTICADOS (TOKEN) ==
// =========================================================

app.get('/api/clientes/perfil', authMiddleware, async (req, res) => {
  try {
    const cliente = await ClientFacade.obtenerPerfil(req.user.idCliente);
    if (!cliente) return res.status(404).json({ error: 'Perfil no encontrado.' });
    res.status(200).json(cliente);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ error: 'No se pudo obtener el perfil.' });
  }
});

app.put('/api/clientes/perfil', authMiddleware, async (req, res) => {
  try {
    const { nombre, apellido, genero, telefono, direccion } = req.body;
    const datosActualizados = { nombre, apellido, genero, telefono, direccion };
    const clienteActualizado = await ClientFacade.actualizarPerfil(req.user.idCliente, datosActualizados);
    res.status(200).json(clienteActualizado);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
});

app.delete('/api/clientes/perfil', authMiddleware, async (req, res) => {
  try {
    await ClientFacade.eliminar(req.user.idCliente);
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ error: 'No se pudo eliminar la cuenta.' });
  }
});

// ===================================================================
// == RUTAS PROTEGIDAS SOLO PARA ADMINISTRADORES (TOKEN + ROL ADMIN)==
// ===================================================================

app.get('/api/clientes', authMiddleware, isAdmin, async (req, res) => {
  try {
    const clientes = await ClientFacade.listarTodos();
    res.status(200).json(clientes);
  } catch (error) {
    console.error("Error al listar clientes:", error);
    res.status(500).json({ error: 'No se pudieron obtener los clientes.' });
  }
});

app.get('/api/clientes/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const cliente = await ClientFacade.obtenerPerfil(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.status(200).json(cliente);
  } catch (error) {
    console.error("Error al obtener cliente por ID:", error);
    res.status(500).json({ error: 'No se pudo obtener el cliente.' });
  }
});

// ==========================================
// ==      RUTAS DE DIRECCIONES (TOKEN)    ==
// ==========================================

app.post('/api/clientes/direcciones', authMiddleware, async (req, res) => {
  try {
    const nuevaDireccion = await ClientFacade.agregarDireccion(req.user.idCliente, req.body);
    res.status(201).json(nuevaDireccion);
  } catch (error) {
    console.error("Error al agregar dirección:", error);
    res.status(500).json({ error: 'No se pudo agregar la dirección.' });
  }
});

app.get('/api/clientes/direcciones', authMiddleware, async (req, res) => {
  try {
    const direcciones = await ClientFacade.obtenerDirecciones(req.user.idCliente);
    res.status(200).json(direcciones);
  } catch (error) {
    console.error("Error al obtener direcciones:", error);
    res.status(500).json({ error: 'No se pudieron obtener las direcciones.' });
  }
});

app.get('/api/clientes/direcciones/:id', authMiddleware, async (req, res) => {
  try {
    const direccion = await ClientFacade.obtenerDireccion(req.params.id, req.user.idCliente);
    if (!direccion) return res.status(404).json({ error: 'Dirección no encontrada.' });
    res.status(200).json(direccion);
  } catch (error) {
    console.error("Error al obtener dirección:", error);
    res.status(500).json({ error: 'No se pudo obtener la dirección.' });
  }
});

app.put('/api/clientes/direcciones/:id', authMiddleware, async (req, res) => {
  try {
    await ClientFacade.actualizarDireccion(req.params.id, req.user.idCliente, req.body);
    res.status(200).json({ mensaje: 'Dirección actualizada exitosamente.' });
  } catch (error) {
    console.error("Error al actualizar dirección:", error);
    res.status(500).json({ error: 'No se pudo actualizar la dirección.' });
  }
});

app.delete('/api/clientes/direcciones/:id', authMiddleware, async (req, res) => {
  try {
    await ClientFacade.eliminarDireccion(req.params.id, req.user.idCliente);
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar dirección:", error);
    res.status(500).json({ error: 'No se pudo eliminar la dirección.' });
  }
});

// Exportar para Vercel
export default app;
