import prisma from '../../database/config/prisma.js';
import ProductoPrototype from '../patterns/ProductoPrototype.js';

class CatalogoFacade {

  async crearProducto(datosProducto) {
    const nuevoProducto = await prisma.producto.create({
      data: datosProducto
    });
    return nuevoProducto;
  }

  async clonarProducto(idProducto, modificaciones = {}) {
    const productoOriginal = await prisma.producto.findUnique({
      where: { idProducto }
    });

    if (!productoOriginal) {
      const error = new Error('Producto no encontrado para clonar.');
      error.code = 'PRODUCTO_NO_ENCONTRADO';
      throw error;
    }

    const prototipo = ProductoPrototype.fromDatabase(productoOriginal);
    const productoClon = prototipo.cloneConModificaciones(modificaciones);

    const nuevoProducto = await prisma.producto.create({
      data: productoClon.toData()
    });

    return nuevoProducto;
  }

  async obtenerProductos(filtros = {}) {
    const where = {};

    if (filtros.categoria) {
      where.categoria = filtros.categoria;
    }

    if (filtros.genero) {
      where.genero = filtros.genero;
    }

    if (filtros.precioMin || filtros.precioMax) {
      where.precio = {};
      if (filtros.precioMin) where.precio.gte = parseFloat(filtros.precioMin);
      if (filtros.precioMax) where.precio.lte = parseFloat(filtros.precioMax);
    }

    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } }
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });

    return productos;
  }

  async obtenerProductoPorId(idProducto) {
    const producto = await prisma.producto.findUnique({
      where: { idProducto }
    });

    if (!producto) {
      const error = new Error('Producto no encontrado.');
      error.code = 'PRODUCTO_NO_ENCONTRADO';
      throw error;
    }

    return producto;
  }

  async actualizarProducto(idProducto, datosActualizados) {
    const productoActualizado = await prisma.producto.update({
      where: { idProducto },
      data: datosActualizados
    });

    return productoActualizado;
  }

  async eliminarProducto(idProducto) {
    await prisma.producto.delete({
      where: { idProducto }
    });
    return true;
  }

  async actualizarStock(idProducto, nuevoStock) {
    const productoActualizado = await prisma.producto.update({
      where: { idProducto },
      data: { stock: nuevoStock }
    });

    return productoActualizado;
  }

  async verificarStock(idProducto, cantidadRequerida) {
    const producto = await this.obtenerProductoPorId(idProducto);
    return producto.stock >= cantidadRequerida;
  }

  async reducirStock(idProducto, cantidad) {
    const producto = await this.obtenerProductoPorId(idProducto);
    
    if (producto.stock < cantidad) {
      const error = new Error('Stock insuficiente.');
      error.code = 'STOCK_INSUFICIENTE';
      throw error;
    }

    const nuevoStock = producto.stock - cantidad;
    return await this.actualizarStock(idProducto, nuevoStock);
  }
}

export default new CatalogoFacade();