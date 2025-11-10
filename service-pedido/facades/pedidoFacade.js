import prisma from '../../database/config/prisma.js';
import Carrito from '../patterns/Carrito.js';
import CarritoCaretaker from '../patterns/CarritoCaretaker.js';
// Eliminado axios y referencias a servicio de pagos, no se usa pasarela en esta fase

class PedidoFacade {
  constructor() {
    this.caretakers = new Map();
  }

  async _getCarritoFromDB(clienteId) {
    console.log('🔍 _getCarritoFromDB - buscando items para clienteId:', clienteId);
    
    const items = await prisma.carritoItem.findMany({
      where: { clienteId },
      include: { producto: true }
    });

    console.log('🔍 Items encontrados en DB:', items.length);
    console.log('🔍 Items detallados:', JSON.stringify(items, null, 2));

    const carrito = new Carrito();
    carrito.items = items.map(item => ({
      productoId: item.productoId,
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario
    }));

    console.log('🔍 Carrito.items después de mapear:', carrito.items);
    return carrito;
  }

  async _saveCarritoToDB(clienteId, carrito) {
    await prisma.carritoItem.deleteMany({
      where: { clienteId }
    });

    if (carrito.items.length > 0) {
      await prisma.carritoItem.createMany({
        data: carrito.items.map(item => ({
          clienteId,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario
        }))
      });
    }
  }

  _getCaretaker(clienteId) {
    if (!this.caretakers.has(clienteId)) {
      this.caretakers.set(clienteId, new CarritoCaretaker());
    }
    return this.caretakers.get(clienteId);
  }

  _guardarEstado(clienteId, carrito) {
    const caretaker = this._getCaretaker(clienteId);
    const memento = carrito.guardarEstado();
    caretaker.guardar(memento);
  }


  async agregarAlCarrito(clienteId, productoId, cantidad) {
    const producto = await prisma.producto.findUnique({
      where: { idProducto: productoId }
    });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.stock < cantidad) {
      throw new Error('Stock insuficiente');
    }

    const carrito = await this._getCarritoFromDB(clienteId);
    
    carrito.agregarProducto({
      productoId: producto.idProducto,
      nombre: producto.nombre,
      cantidad: cantidad,
      precioUnitario: producto.precio
    });

    await this._saveCarritoToDB(clienteId, carrito);

    this._guardarEstado(clienteId, carrito);

    return carrito.getItems();
  }

  async modificarCantidad(clienteId, productoId, nuevaCantidad) {
    const producto = await prisma.producto.findUnique({
      where: { idProducto: productoId }
    });

    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.stock < nuevaCantidad) {
      throw new Error('Stock insuficiente');
    }

    const carrito = await this._getCarritoFromDB(clienteId);
    carrito.modificarCantidad(productoId, nuevaCantidad);

    await this._saveCarritoToDB(clienteId, carrito);
    this._guardarEstado(clienteId, carrito);

    return carrito.getItems();
  }

  async eliminarDelCarrito(clienteId, productoId) {
    const carrito = await this._getCarritoFromDB(clienteId);
    carrito.eliminarProducto(productoId);

    await this._saveCarritoToDB(clienteId, carrito);
    this._guardarEstado(clienteId, carrito);

    return carrito.getItems();
  }

  async verCarrito(clienteId) {
    console.log('📦 verCarrito - clienteId:', clienteId);
    const carrito = await this._getCarritoFromDB(clienteId);
    console.log('📦 Items del carrito:', carrito.getItems());
    
    const resultado = {
      items: carrito.getItems(),
      total: carrito.calcularTotal(),
      cantidadItems: carrito.getItems().length
    };
    
    console.log('📦 Resultado final:', JSON.stringify(resultado, null, 2));
    return resultado;
  }

  async deshacerCarrito(clienteId) {
    const carrito = await this._getCarritoFromDB(clienteId);
    const caretaker = this._getCaretaker(clienteId);

    const mementoAnterior = caretaker.deshacer();
    if (!mementoAnterior) {
      throw new Error('No hay acciones para deshacer');
    }

    carrito.restaurarEstado(mementoAnterior);
    await this._saveCarritoToDB(clienteId, carrito);
    
    return carrito.getItems();
  }

  async rehacerCarrito(clienteId) {
    const carrito = await this._getCarritoFromDB(clienteId);
    const caretaker = this._getCaretaker(clienteId);

    const mementoSiguiente = caretaker.rehacer();
    if (!mementoSiguiente) {
      throw new Error('No hay acciones para rehacer');
    }

    carrito.restaurarEstado(mementoSiguiente);
    await this._saveCarritoToDB(clienteId, carrito);
    
    return carrito.getItems();
  }


  // Crea un pedido a partir del carrito SIN integrar pasarela de pago
  async finalizarPedidoSinPago(clienteId, direccionId) {
    const carrito = await this._getCarritoFromDB(clienteId);
    const items = carrito.getItems();

    if (items.length === 0) {
      throw new Error('El carrito está vacío');
    }

    // Validar dirección seleccionada
    if (!direccionId) {
      throw new Error('Debe seleccionar una dirección de envío');
    }

    const direccion = await prisma.direccion.findFirst({
      where: { idDireccion: direccionId, clienteId }
    });

    if (!direccion) {
      throw new Error('Dirección inválida');
    }

    // Calcular monto total antes de crear el pedido
    const montoTotal = carrito.calcularTotal();

    // Validar stock
    for (const item of items) {
      const producto = await prisma.producto.findUnique({
        where: { idProducto: item.productoId }
      });

      if (!producto || producto.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para ${item.nombre}`);
      }
    }

    // Crear el pedido en estado pendiente (sin reducir stock aún)
    const pedido = await prisma.pedido.create({
      data: {
        clienteId: clienteId,
        estado: 'Pendiente',
        direccionId: direccionId,
        montoTotal: montoTotal,
        articulos: {
          create: items.map(item => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario
          }))
        }
      },
      include: {
        articulos: {
          include: {
            producto: true
          }
        },
        cliente: true,
        direccion: true
      }
    });

    // En este modo, simplemente devolvemos el pedido creado
    return pedido;
  }

  // confirmación de pago eliminada en esta fase (sin pasarela de pago)

  async obtenerHistorialPedidos(clienteId) {
    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: clienteId },
      include: {
        articulos: {
          include: {
            producto: true
          }
        },
        direccion: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    return pedidos;
  }

  async obtenerDetallePedido(pedidoId, clienteId) {
    const pedido = await prisma.pedido.findUnique({
      where: { idPedido: pedidoId },
      include: {
        articulos: {
          include: {
            producto: true
          }
        },
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        },
        direccion: true
      }
    });

    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    if (clienteId && pedido.clienteId !== clienteId) {
      throw new Error('No tienes permiso para ver este pedido');
    }

    return pedido;
  }


  async listarTodosPedidos() {
    const pedidos = await prisma.pedido.findMany({
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            email: true
          }
        },
        articulos: {
          include: {
            producto: true
          }
        },
        direccion: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    return pedidos;
  }

  async actualizarEstadoPedido(pedidoId, nuevoEstado) {
    const estadosValidos = ['Pendiente', 'Procesando', 'Enviado', 'Entregado', 'Cancelado'];
    
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error('Estado no válido');
    }

    const pedido = await prisma.pedido.update({
      where: { idPedido: pedidoId },
      data: { estado: nuevoEstado },
      include: {
        articulos: {
          include: {
            producto: true
          }
        }
      }
    });

    return pedido;
  }
}

export default new PedidoFacade();
