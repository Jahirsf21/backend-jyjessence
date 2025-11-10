import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import authMiddleware from '../shared/middleware/auth.js';
import isAdmin from '../shared/middleware/admin.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function uploadToCloudinary(filePath) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'jyjessence/productos',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } finally {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error al eliminar archivo temporal:', error);
    }
  }
}

async function deleteFromCloudinary(publicId) {
  const result = await cloudinary.uploader.destroy(publicId);
  return result;
}

function extractPublicId(url) {
  if (!url) return null;
  
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    const pathParts = parts.slice(uploadIndex + 2);
    const publicId = pathParts.join('/').split('.')[0];
    
    return publicId;
  } catch (error) {
    console.error('Error extrayendo publicId:', error);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/imagenes/upload') {
    try {
      await new Promise((resolve, reject) => {
        authMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        isAdmin(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const form = formidable({
        multiples: true,
        maxFiles: 4,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        filter: ({ mimetype }) => {
          return mimetype && mimetype.includes('image');
        }
      });

      const [fields, files] = await form.parse(req);

      if (!files.images || files.images.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron imágenes' });
      }

      const uploadPromises = files.images.map(file => uploadToCloudinary(file.filepath));
      const imageDataArray = await Promise.all(uploadPromises);

      res.status(200).json({
        mensaje: `${imageDataArray.length} imagen(es) subida(s) exitosamente`,
        data: imageDataArray
      });
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Error al subir imágenes' 
      });
    }
  }

  else if (req.method === 'DELETE' && req.url === '/api/imagenes/delete') {
    try {
      await new Promise((resolve, reject) => {
        authMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        isAdmin(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const { publicId, publicIds } = req.body;

      if (!publicId && (!publicIds || publicIds.length === 0)) {
        return res.status(400).json({ error: 'Se requiere publicId o publicIds' });
      }

      if (publicId) {
        const result = await deleteFromCloudinary(publicId);
        return res.status(200).json({
          mensaje: 'Imagen eliminada exitosamente',
          result
        });
      }

      const deletePromises = publicIds.map(id => deleteFromCloudinary(id));
      const results = await Promise.all(deletePromises);

      res.status(200).json({
        mensaje: `${results.length} imagen(es) eliminada(s) exitosamente`,
        results
      });
    } catch (error) {
      console.error('Error al eliminar imágenes:', error);
      res.status(error.statusCode || 500).json({ 
        error: error.message || 'Error al eliminar imágenes' 
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
