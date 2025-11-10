import prisma from '../../database/config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URLSearchParams } from 'url';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

class ClientFacade {

  async consultarCedulaTSE(cedula) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    const tseUrl = 'https://servicioselectorales.tse.go.cr/chc/consulta_cedula.aspx';
    
    try {

      const initialResponse = await client.get(tseUrl);
      const $ = cheerio.load(initialResponse.data);
      const viewState = $('#__VIEWSTATE').val();
      const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val();
      const eventValidation = $('#__EVENTVALIDATION').val();

      const formData = new URLSearchParams();
      formData.append('__VIEWSTATE', viewState);
      formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
      formData.append('__EVENTVALIDATION', eventValidation);
      formData.append('txtcedula', cedula);
      formData.append('btnConsultaCedula', 'Consultar');

      const postResponse = await client.post(tseUrl, formData, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': tseUrl
        },
      });

      const $result = cheerio.load(postResponse.data);
      const nombreCompleto = $result('#lblnombrecompleto').text().trim();

      if (!nombreCompleto || nombreCompleto.includes('no encontrada')) {
        return null;
      }

      const partes = nombreCompleto.split(' ');
      const nombre  = partes.slice(0, 2).join(' ');
      const apellido = partes.slice(2).join(' ');
      return { cedula, nombre, apellido };
    } catch (error) {
      console.error('Error en el scraping del TSE:', error);
      throw new Error('No se pudo consultar la información en el TSE.');
    }
  }

  async autenticar(email, contrasena) {
    const cliente = await prisma.cliente.findUnique({ where: { email } });
    
    if (!cliente) {
      const error = new Error('No existe una cuenta con este correo electrónico');
      error.code = 'EMAIL_NO_ENCONTRADO';
      throw error;
    }
    
    const contrasenaValida = await bcrypt.compare(contrasena, cliente.contrasena);
    if (!contrasenaValida) {
      const error = new Error('La contraseña ingresada es incorrecta');
      error.code = 'CONTRASENA_INCORRECTA';
      throw error;
    }
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }
    const secretKey = process.env.JWT_SECRET;
    const payload = { idCliente: cliente.idCliente, email: cliente.email, role: cliente.role };
    const token = jwt.sign(payload, secretKey, { expiresIn: '8h' });
    const { contrasena: _, ...clienteSeguro } = cliente;
    return { token, usuario: clienteSeguro };
  }

  async registrar(datosCliente) {
    // Verificar si ya existe un usuario con la misma cédula
    const clienteExistentePorCedula = await prisma.cliente.findUnique({
      where: { cedula: datosCliente.cedula }
    });
    
    if (clienteExistentePorCedula) {
      const error = new Error('Ya existe un usuario registrado con esta cédula');
      error.code = 'CEDULA_DUPLICADA';
      throw error;
    }
    
    // Verificar si ya existe un usuario con el mismo email
    const clienteExistentePorEmail = await prisma.cliente.findUnique({
      where: { email: datosCliente.email }
    });
    
    if (clienteExistentePorEmail) {
      const error = new Error('Ya existe una cuenta con este correo electrónico');
      error.code = 'EMAIL_DUPLICADO';
      throw error;
    }
    
    const datosTSE = await this.consultarCedulaTSE(datosCliente.cedula);
    if (!datosTSE) {
      const error = new Error('La cédula proporcionada no es válida o no fue encontrada.');
      error.code = 'CEDULA_INVALIDA';
      throw error;
    }

    const saltRounds = 10;
    const contrasenaHasheada = await bcrypt.hash(datosCliente.contrasena, saltRounds);
    
    // Preparar datos del cliente
    const datosCreacion = {
      cedula: datosCliente.cedula,
      nombre: datosTSE.nombre,
      apellido: datosTSE.apellido,
      email: datosCliente.email,
      contrasena: contrasenaHasheada,
      genero: datosCliente.genero,
      telefono: datosCliente.telefono,
    };

    // Si se proporciona dirección, agregarla como relación anidada
    if (datosCliente.direccion) {
      datosCreacion.direcciones = {
        create: {
          provincia: datosCliente.direccion.provincia,
          canton: datosCliente.direccion.canton,
          distrito: datosCliente.direccion.distrito,
          barrio: datosCliente.direccion.barrio || null,
          senas: datosCliente.direccion.senas,
          codigoPostal: datosCliente.direccion.codigoPostal || null,
          referencia: datosCliente.direccion.referencia || null,
        }
      };
    }
    
    const nuevoCliente = await prisma.cliente.create({
      data: datosCreacion,
      include: {
        direcciones: true
      }
    });
    
    const { contrasena: _, ...clienteSeguro } = nuevoCliente;
    return clienteSeguro;
  }

  async eliminar(idCliente) {
    await prisma.cliente.delete({ where: { idCliente } });
    return true; 
  }

  async obtenerPerfil(idCliente) {
    const cliente = await prisma.cliente.findUnique({
      where: { idCliente },
      select: {
        idCliente: true, 
        nombre: true, 
        apellido: true, 
        email: true, 
        genero: true, 
        telefono: true, 
        role: true,
        direcciones: true
      }
    });
    return cliente;
  }

  async actualizarPerfil(idCliente, datos) {
    const clienteActualizado = await prisma.cliente.update({
      where: { idCliente },
      data: datos,
      select: {
        idCliente: true, 
        nombre: true, 
        apellido: true, 
        email: true, 
        genero: true, 
        telefono: true, 
        role: true,
        direcciones: true
      }
    });
    return clienteActualizado;
  }

  async listarTodos() {
    return await prisma.cliente.findMany({
      select: {
        idCliente: true, 
        nombre: true, 
        apellido: true, 
        email: true, 
        genero: true, 
        role: true, 
        telefono: true,
        direcciones: true
      }
    });
  }

  // ==========================================
  // == OPERACIONES DE DIRECCIONES
  // ==========================================

  async agregarDireccion(idCliente, datosDireccion) {
    const nuevaDireccion = await prisma.direccion.create({
      data: {
        clienteId: idCliente,
        provincia: datosDireccion.provincia,
        canton: datosDireccion.canton,
        distrito: datosDireccion.distrito,
        barrio: datosDireccion.barrio || null,
        senas: datosDireccion.senas,
        codigoPostal: datosDireccion.codigoPostal || null,
        referencia: datosDireccion.referencia || null,
      },
    });
    return nuevaDireccion;
  }

  async obtenerDirecciones(idCliente) {
    return await prisma.direccion.findMany({
      where: { clienteId: idCliente },
      orderBy: { idDireccion: 'desc' }
    });
  }

  async obtenerDireccion(idDireccion, idCliente) {
    return await prisma.direccion.findFirst({
      where: { 
        idDireccion,
        clienteId: idCliente 
      }
    });
  }

  async actualizarDireccion(idDireccion, idCliente, datos) {
    const direccionActualizada = await prisma.direccion.updateMany({
      where: { 
        idDireccion,
        clienteId: idCliente 
      },
      data: datos
    });
    return direccionActualizada;
  }

  async eliminarDireccion(idDireccion, idCliente) {
    await prisma.direccion.deleteMany({
      where: { 
        idDireccion,
        clienteId: idCliente 
      }
    });
    return true;
  }
}

export default new ClientFacade();