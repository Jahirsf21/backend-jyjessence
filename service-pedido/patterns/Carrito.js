import CarritoMemento from './CarritoMemento.js';

// Originator: Objeto cuyo estado queremos guardar (el carrito)
class Carrito {
  constructor() {
    this.items = []; // Array de { productoId, nombre, cantidad, precioUnitario }
  }

  // Agregar producto al carrito
  agregarProducto(producto) {
    const itemExistente = this.items.find(item => item.productoId === producto.productoId);
    
    if (itemExistente) {
      itemExistente.cantidad += producto.cantidad;
    } else {
      this.items.push({
        productoId: producto.productoId,
        nombre: producto.nombre,
        cantidad: producto.cantidad,
        precioUnitario: producto.precioUnitario
      });
    }
  }

  // Modificar cantidad de un producto
  modificarCantidad(productoId, nuevaCantidad) {
    const item = this.items.find(item => item.productoId === productoId);
    
    if (!item) {
      throw new Error('Producto no encontrado en el carrito');
    }

    if (nuevaCantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    item.cantidad = nuevaCantidad;
  }

  // Eliminar producto del carrito
  eliminarProducto(productoId) {
    const index = this.items.findIndex(item => item.productoId === productoId);
    
    if (index === -1) {
      throw new Error('Producto no encontrado en el carrito');
    }

    this.items.splice(index, 1);
  }

  // Obtener items del carrito
  getItems() {
    return this.items;
  }

  // Calcular total del carrito
  calcularTotal() {
    return this.items.reduce((total, item) => {
      return total + (item.cantidad * item.precioUnitario);
    }, 0);
  }

  // Limpiar carrito
  limpiar() {
    this.items = [];
  }

  // Crear memento (guardar estado actual)
  guardarEstado() {
    return new CarritoMemento(this.items);
  }

  // Restaurar desde memento
  restaurarEstado(memento) {
    this.items = memento.getItems();
  }
}

export default Carrito;
