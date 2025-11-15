import express from 'express';
import enumsRouter from './enums.js';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authMiddleware from '../shared/middleware/auth.js';
import isAdmin from '../shared/middleware/admin.js';
import CatalogoFacade from '../service-catalogo/facades/catalogoFacade.js';

// Configurar dotenv para leer desde la carpeta database/
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../database/.env') });

const app = express();

app.use(express.json());

// ==========================================
// ==      RUTA ENUMS (PÚBLICA)            ==
// ==========================================
app.use('/api', enumsRouter);
// ==      RUTAS PÚBLICAS (SIN TOKEN)      ==
// ==========================================

app.get('/api/productos', async (req, res) => {
  try {
    const filtros = {
      categoria: req.query.categoria,
      genero: req.query.genero,
      precioMin: req.query.precioMin,
      precioMax: req.query.precioMax,
      busqueda: req.query.busqueda
    };

    const productos = await CatalogoFacade.obtenerProductos(filtros);
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: 'No se pudieron obtener los productos.' });
  }
});

app.get('/api/productos/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda.' });
    }

    const productos = await CatalogoFacade.obtenerProductos({ busqueda: q });
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error en búsqueda de productos:", error);
    res.status(500).json({ error: 'Error al buscar productos.' });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const producto = await CatalogoFacade.obtenerProductoPorId(req.params.id);
    res.status(200).json(producto);
  } catch (error) {
    if (error.code === 'PRODUCTO_NO_ENCONTRADO') {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error al obtener producto:", error);
    res.status(500).json({ error: 'No se pudo obtener el producto.' });
  }
});

// ===================================================================
// == RUTAS PROTEGIDAS SOLO PARA ADMINISTRADORES (TOKEN + ROL ADMIN)==
// ===================================================================

app.post('/api/productos', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, categoria, genero, mililitros, precio, stock, imagenesUrl } = req.body;

    if (!nombre || !descripcion || !categoria || !genero || mililitros === undefined || precio === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    // Normalización de enums (frontend puede enviar valores en español o con espacios)
    const mapCategoria = (valor) => {
      if (!valor) return null;
      const v = valor.toString().trim().toLowerCase();
      const mapa = {
        'extrait de parfum': 'ExtraitDeParfum',
        'extraitdeparfum': 'ExtraitDeParfum',
        'parfum': 'Parfum',
        'perfume': 'Parfum',
        'eau de parfum': 'EauDeParfum',
        'eaudeparfum': 'EauDeParfum',
        'eau de toilette': 'EauDeToilette',
        'eaudetoilette': 'EauDeToilette',
        'eau fraiche': 'EauFraiche',
        'eaufraiche': 'EauFraiche',
        'fraiche': 'EauFraiche',
        'elixir': 'Elixir',
        'colonia': 'EauFraiche'
      };
      return mapa[v] || null;
    };

    const mapGenero = (valor) => {
      if (!valor) return null;
      const v = valor.toString().trim().toLowerCase();
      const mapa = {
        'male': 'Male',
        'hombre': 'Male',
        'masculino': 'Male',
        'female': 'Female',
        'mujer': 'Female',
        'femenino': 'Female',
        'unisex': 'Unisex'
      };
      return mapa[v] || null;
    };

    const categoriaEnum = mapCategoria(categoria);
    const generoEnum = mapGenero(genero);

    if (!categoriaEnum) {
      return res.status(400).json({ error: 'Categoría inválida', detalle: categoria });
    }
    if (!generoEnum) {
      return res.status(400).json({ error: 'Género inválido', detalle: genero });
    }

    const nuevoProducto = await CatalogoFacade.crearProducto({
      nombre,
      descripcion,
      categoria: categoriaEnum,
      genero: generoEnum,
      mililitros: parseInt(mililitros),
      precio: parseFloat(precio),
      stock: parseInt(stock),
      imagenesUrl: Array.isArray(imagenesUrl) ? imagenesUrl : []
    });

    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: 'No se pudo crear el producto.' });
  }
});

app.post('/api/productos/:id/clonar', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const modificaciones = req.body;

    const productoClon = await CatalogoFacade.clonarProducto(id, modificaciones);
    res.status(201).json(productoClon);
  } catch (error) {
    if (error.code === 'PRODUCTO_NO_ENCONTRADO') {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error al clonar producto:", error);
    res.status(500).json({ error: 'No se pudo clonar el producto.' });
  }
});

// Helpers de normalización reutilizables
const mapCategoria = (valor) => {
  if (!valor) return null;
  const v = valor.toString().trim().toLowerCase();
  const mapa = {
    'extrait de parfum': 'ExtraitDeParfum',
    'extraitdeparfum': 'ExtraitDeParfum',
    'parfum': 'Parfum',
    'perfume': 'Parfum',
    'eau de parfum': 'EauDeParfum',
    'eaudeparfum': 'EauDeParfum',
    'eau de toilette': 'EauDeToilette',
    'eaudetoilette': 'EauDeToilette',
    'eau fraiche': 'EauFraiche',
    'eaufraiche': 'EauFraiche',
    'fraiche': 'EauFraiche',
    'elixir': 'Elixir',
    'colonia': 'EauFraiche'
  };
  return mapa[v] || null;
};

const mapGenero = (valor) => {
  if (!valor) return null;
  const v = valor.toString().trim().toLowerCase();
  const mapa = {
    'male': 'Male',
    'hombre': 'Male',
    'masculino': 'Male',
    'female': 'Female',
    'mujer': 'Female',
    'femenino': 'Female',
    'unisex': 'Unisex'
  };
  return mapa[v] || null;
};

app.put('/api/productos/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, categoria, genero, mililitros, precio, stock, imagenesUrl } = req.body;
    
    const datosActualizados = {};
    if (nombre !== undefined) datosActualizados.nombre = nombre;
    if (descripcion !== undefined) datosActualizados.descripcion = descripcion;
    if (categoria !== undefined) {
      const mapped = mapCategoria(categoria) || categoria;
      datosActualizados.categoria = mapped;
    }
    if (genero !== undefined) {
      const mapped = mapGenero(genero) || genero;
      datosActualizados.genero = mapped;
    }
    if (mililitros !== undefined) datosActualizados.mililitros = parseInt(mililitros);
    if (precio !== undefined) datosActualizados.precio = parseFloat(precio);
    if (stock !== undefined) datosActualizados.stock = parseInt(stock);
    if (imagenesUrl !== undefined) datosActualizados.imagenesUrl = Array.isArray(imagenesUrl) ? imagenesUrl : [];

    const productoActualizado = await CatalogoFacade.actualizarProducto(req.params.id, datosActualizados);
    res.status(200).json(productoActualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: 'No se pudo actualizar el producto.' });
  }
});

app.delete('/api/productos/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    await CatalogoFacade.eliminarProducto(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ error: 'No se pudo eliminar el producto.' });
  }
});

app.patch('/api/productos/:id/stock', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { stock } = req.body;
    
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ error: 'El stock debe ser un número válido mayor o igual a 0.' });
    }

    const productoActualizado = await CatalogoFacade.actualizarStock(req.params.id, parseInt(stock));
    res.status(200).json(productoActualizado);
  } catch (error) {
    if (error.code === 'PRODUCTO_NO_ENCONTRADO') {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error al actualizar stock:", error);
    res.status(500).json({ error: 'No se pudo actualizar el stock.' });
  }
});

// Handler Vercel-compatible con CORS manual
const handler = async (req, res) => {
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
  
  // Delegar a la app de Express
  return app(req, res);
};

export default handler;
