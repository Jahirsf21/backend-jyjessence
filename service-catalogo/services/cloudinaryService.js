import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

class CloudinaryService {
  /**
   * Sube una imagen a Cloudinary
   * @param {string} filePath - Ruta del archivo temporal
   * @param {string} folder - Carpeta en Cloudinary
   * @returns {Promise<Object>} Datos de la imagen subida
   */
  async uploadImage(filePath, folder = 'jyjessence/productos') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' }, // Máximo 1000x1000
          { quality: 'auto' }, // Calidad automática
          { fetch_format: 'auto' } // Formato automático (WebP si es soportado)
        ]
      });

      // Eliminar archivo temporal
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      // Eliminar archivo temporal en caso de error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new Error(`Error al subir imagen: ${error.message}`);
    }
  }

  /**
   * Elimina una imagen de Cloudinary
   * @param {string} publicId - ID público de la imagen en Cloudinary
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error(`Error al eliminar imagen: ${error.message}`);
    }
  }

  /**
   * Genera URL optimizada con transformaciones
   * @param {string} publicId - ID público de la imagen
   * @param {Object} options - Opciones de transformación
   * @returns {string} URL optimizada
   */
  getOptimizedUrl(publicId, options = {}) {
    const {
      width = 500,
      height = 500,
      crop = 'fill',
      quality = 'auto',
      format = 'auto'
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format,
      secure: true
    });
  }

  /**
   * Extrae el publicId de una URL de Cloudinary
   * @param {string} url - URL de Cloudinary
   * @returns {string} Public ID
   */
  extractPublicId(url) {
    if (!url) return null;
    
    try {
      // URL típica: https://res.cloudinary.com/cloud-name/image/upload/v123/folder/image.jpg
      const parts = url.split('/');
      const uploadIndex = parts.indexOf('upload');
      
      if (uploadIndex === -1) return null;
      
      // Tomar todo después de 'upload' y la versión
      const pathParts = parts.slice(uploadIndex + 2);
      const publicId = pathParts.join('/').split('.')[0]; // Remover extensión
      
      return publicId;
    } catch (error) {
      console.error('Error extrayendo publicId:', error);
      return null;
    }
  }
}

export default new CloudinaryService();
