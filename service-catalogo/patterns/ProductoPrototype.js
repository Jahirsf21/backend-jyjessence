class ProductoPrototype {
  constructor(data) {
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.categoria = data.categoria;
    this.genero = data.genero;
    this.mililitros = data.mililitros;
    this.precio = data.precio;
    this.stock = data.stock;
  }

  clone() {
    return new ProductoPrototype({
      nombre: this.nombre,
      descripcion: this.descripcion,
      categoria: this.categoria,
      genero: this.genero,
      mililitros: this.mililitros,
      precio: this.precio,
      stock: this.stock
    });
  }

  cloneConModificaciones(modificaciones) {
    const clon = this.clone();
    Object.assign(clon, modificaciones);
    return clon;
  }

  toData() {
    return {
      nombre: this.nombre,
      descripcion: this.descripcion,
      categoria: this.categoria,
      genero: this.genero,
      mililitros: this.mililitros,
      precio: this.precio,
      stock: this.stock
    };
  }

  /**
   * Crea un prototipo desde un producto de la base de datos
   * @param {Object} productoDb - Producto de Prisma
   * @returns {ProductoPrototype}
   */
  static fromDatabase(productoDb) {
    return new ProductoPrototype({
      nombre: productoDb.nombre,
      descripcion: productoDb.descripcion,
      categoria: productoDb.categoria,
      genero: productoDb.genero,
      mililitros: productoDb.mililitros,
      precio: productoDb.precio,
      stock: productoDb.stock
    });
  }
}

export default ProductoPrototype;