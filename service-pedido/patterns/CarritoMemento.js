// Memento: Almacena el estado del carrito en un momento específico
class CarritoMemento {
  constructor(items, timestamp = new Date()) {
    this._items = JSON.parse(JSON.stringify(items)); 
    this._timestamp = timestamp;
  }

  getItems() {
    return JSON.parse(JSON.stringify(this._items)); 
  }

  getTimestamp() {
    return this._timestamp;
  }
}

export default CarritoMemento;
