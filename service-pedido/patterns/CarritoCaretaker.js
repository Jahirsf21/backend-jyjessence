class CarritoCaretaker {
  constructor() {
    this.historial = [];
    this.posicionActual = -1;
  }

  guardar(memento) {
    this.historial = this.historial.slice(0, this.posicionActual + 1);
    
    this.historial.push(memento);
    this.posicionActual++;

    if (this.historial.length > 10) {
      this.historial.shift();
      this.posicionActual--;
    }
  }

  deshacer() {
    if (!this.puedeDeshacer()) {
      return null;
    }

    this.posicionActual--;
    return this.historial[this.posicionActual];
  }

  rehacer() {
    if (!this.puedeRehacer()) {
      return null;
    }

    this.posicionActual++;
    return this.historial[this.posicionActual];
  }

  puedeDeshacer() {
    return this.posicionActual > 0;
  }

  puedeRehacer() {
    return this.posicionActual < this.historial.length - 1;
  }

  getEstadoActual() {
    if (this.posicionActual >= 0 && this.posicionActual < this.historial.length) {
      return this.historial[this.posicionActual];
    }
    return null;
  }

  limpiar() {
    this.historial = [];
    this.posicionActual = -1;
  }

  getInfoHistorial() {
    return {
      totalEstados: this.historial.length,
      posicionActual: this.posicionActual,
      puedeDeshacer: this.puedeDeshacer(),
      puedeRehacer: this.puedeRehacer()
    };
  }
}

export default CarritoCaretaker;
