import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authMiddleware from '../shared/middleware/auth.js';
import isAdmin from '../shared/middleware/admin.js';
import CatalogoFacade from './facades/catalogoFacade.js';
import upload from './middleware/upload.js';
import cloudinaryService from './services/cloudinaryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde database/.env
dotenv.config({ path: join(__dirname, '../database/.env') });

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// ==   ENDPOINTS DE IMÁGENES (CLOUDINARY) ==
// ==========================================

/**
 * POST /api/productos/upload-image
 * Sube una o múltiples imágenes a Cloudinary (máximo 4)
 * Requiere: autenticación + admin
 */
app.post('/api/productos/upload-image', 
  authMiddleware, 
  isAdmin, 
  upload.array('images', 4), // Permite hasta 4 imágenes
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron imágenes' });
      }

      // Subir todas las imágenes a Cloudinary
      const uploadPromises = req.files.map(file => 
        cloudinaryService.uploadImage(file.path)
      );
      
      const imageDataArray = await Promise.all(uploadPromises);
      
      res.status(200).json({
        mensaje: `${imageDataArray.length} imagen(es) subida(s) exitosamente`,
        data: imageDataArray // Array de objetos con url, publicId, etc.
      });
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/productos/delete-image
 * Elimina una o múltiples imágenes de Cloudinary
 * Requiere: autenticación + admin
 */
app.delete('/api/productos/delete-image', 
  authMiddleware, 
  isAdmin, 
  async (req, res) => {
    try {
      const { publicId, publicIds } = req.body;
      
      if (!publicId && (!publicIds || publicIds.length === 0)) {
        return res.status(400).json({ error: 'Se requiere publicId o publicIds' });
      }
      
      // Si viene un solo publicId
      if (publicId) {
        const result = await cloudinaryService.deleteImage(publicId);
        return res.status(200).json({
          mensaje: 'Imagen eliminada exitosamente',
          result
        });
      }
      
      // Si vienen múltiples publicIds
      const deletePromises = publicIds.map(id => 
        cloudinaryService.deleteImage(id)
      );
      
      const results = await Promise.all(deletePromises);
      
      res.status(200).json({
        mensaje: `${results.length} imagen(es) eliminada(s) exitosamente`,
        results
      });
    } catch (error) {
      console.error('Error al eliminar imagen(es):', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ==========================================
// ==   ENDPOINTS DE PRODUCTOS (PÚBLICOS)  ==
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

app.post('/api/productos', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, categoria, genero, mililitros, precio, stock, imagenesUrl } = req.body;

    if (!nombre || !descripcion || !categoria || !genero || !mililitros || !precio || stock === undefined) {
      return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    const nuevoProducto = await CatalogoFacade.crearProducto({
      nombre,
      descripcion,
      categoria,
      genero,
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

app.put('/api/productos/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, categoria, genero, mililitros, precio, stock, imagenesUrl } = req.body;
    
    const datosActualizados = {};
    if (nombre !== undefined) datosActualizados.nombre = nombre;
    if (descripcion !== undefined) datosActualizados.descripcion = descripcion;
    if (categoria !== undefined) datosActualizados.categoria = categoria;
    if (genero !== undefined) datosActualizados.genero = genero;
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
    // Obtener producto antes de eliminarlo para borrar sus imágenes
    const producto = await CatalogoFacade.obtenerProductoPorId(req.params.id);
    
    // Eliminar todas las imágenes de Cloudinary si existen
    if (producto.imagenesUrl && producto.imagenesUrl.length > 0) {
      const deletePromises = producto.imagenesUrl.map(url => {
        const publicId = cloudinaryService.extractPublicId(url);
        if (publicId) {
          return cloudinaryService.deleteImage(publicId).catch(error => {
            console.error('Error al eliminar imagen de Cloudinary:', error);
            // Continuar aunque falle una imagen
          });
        }
      });
      
      await Promise.all(deletePromises);
    }
    
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

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Servidor de Catálogo escuchando en http://localhost:${PORT}`);
});