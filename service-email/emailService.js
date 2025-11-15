import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

// Configurar dotenv para leer desde la carpeta database/
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../database/.env') });

// Inicializar Prisma Client
const prisma = new PrismaClient();

// Configuración del transporter con Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para obtener todos los administradores
export async function getAdminUsers() {
  try {
    const admins = await prisma.cliente.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        email: true,
        nombre: true,
        apellido: true,
        telefono: true
      }
    });
    return admins;
  } catch (error) {
    console.error('Error al obtener administradores:', error);
    return [];
  }
}

// Verificar conexión al iniciar
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    return { success: true };
  } catch (error) {
    console.error('❌ Error al conectar con servidor de correo:', error);
    return { success: false, error: error.message };
  }
};

// Función para enviar correo de confirmación al cliente
export const sendOrderConfirmationEmail = async (pedido, cliente, items) => {
  try {
    const itemsList = items.map(item => 
      `${item.cantidad}x ${item.nombre} - ₡${(item.cantidad * item.precioUnitario).toFixed(2)}`
    ).join('\n');

    const mailOptions = {
      from: `"JYJ Essence" <${process.env.EMAIL_USER}>`,
      to: cliente.email || (cliente.email || 'cliente@ejemplo.com'),
      subject: 'Confirmación de tu pedido - JYJ Essence',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">¡Gracias por tu compra!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu pedido ha sido recibido exitosamente</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Detalles del Pedido</h2>
            <p><strong>Pedido #:</strong> ${pedido.idPedido}</p>
            <p><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleDateString('es-ES')}</p>
            <p><strong>Estado:</strong> <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${pedido.estado}</span></p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Información de Envío</h2>
            <p><strong>Nombre:</strong> ${cliente.nombre} ${cliente.apellido || ''}</p>
            <p><strong>Email:</strong> ${cliente.email}</p>
            ${cliente.telefono ? `<p><strong>Teléfono:</strong> ${cliente.telefono}</p>` : ''}
            ${cliente.direccion ? `
              <p><strong>Dirección:</strong></p>
              <p style="margin-left: 20px;">
                ${cliente.direccion.provincia || ''}, ${cliente.direccion.canton || ''}, ${cliente.direccion.distrito || ''}<br>
                ${cliente.direccion.barrio || ''} ${cliente.direccion.senas || ''}<br>
                ${cliente.direccion.referencia || ''}
              </p>
            ` : ''}
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Productos Comprados</h2>
            ${items.map(item => `
              <div style="border-bottom: 1px solid #dee2e6; padding-bottom: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${item.nombre}</strong><br>
                    <small style="color: #6c757d;">Cantidad: ${item.cantidad} | Precio unitario: ₡${item.precioUnitario.toFixed(2)}</small>
                  </div>
                  <strong>₡${(item.cantidad * item.precioUnitario).toFixed(2)}</strong>
                </div>
              </div>
            `).join('')}
            
            <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; text-align: right;">
              <strong style="font-size: 18px;">Total: ₡${pedido.montoTotal.toFixed(2)}</strong>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 25px; border-radius: 10px; margin: 30px 0; text-align: center;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">💳 Instrucciones de Pago</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px;">Para completar tu pedido, realiza el pago mediante Sinpe Móvil:</p>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0; font-size: 18px;"><strong>📱 Número:</strong> <span style="font-size: 20px;">6044-0248</span></p>
              <p style="margin: 10px 0; font-size: 18px;"><strong>💰 Monto:</strong> <span style="font-size: 20px; color: #ffc107;">₡${pedido.montoTotal.toFixed(2)}</span></p>
              <p style="margin: 10px 0; font-size: 18px;"><strong>📝 Asunto:</strong> <span style="font-size: 20px; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px;">${pedido.idPedido}</span></p>
            </div>
            
            <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">Una vez realizado el pago, tu pedido será procesado y enviado.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6c757d;">¿Tienes preguntas? Contáctanos en jyjessence@gmail.com</p>
            <p style="color: #6c757d; font-size: 14px;">Este es un mensaje automático, por favor no responder.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error al enviar correo de confirmación:', error);
    return { success: false, error: error.message };
  }
};

// Función para enviar correo de notificación a la tienda
export const sendOrderNotificationEmail = async (pedido, cliente, items) => {
  try {
    // Obtener todos los administradores
    const admins = await getAdminUsers();
    
    // Si no hay administradores, enviar al email principal
    const recipients = admins.length > 0 
      ? admins.map(admin => admin.email).join(', ')
      : process.env.EMAIL_USER;

    const itemsList = items.map(item => 
      `${item.cantidad}x ${item.nombre} - ₡${(item.cantidad * item.precioUnitario).toFixed(2)}`
    ).join('\n');

    const mailOptions = {
      from: `"JYJ Essence" <${process.env.EMAIL_USER}>`,
      to: recipients, // Enviar a todos los administradores
      subject: `🛒 Nuevo Pedido #${pedido.idPedido} - JYJ Essence`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">🎉 ¡Nuevo Pedido Recibido!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Se ha generado un nuevo pedido en el sistema</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Información del Pedido</h2>
            <p><strong>Pedido #:</strong> ${pedido.idPedido}</p>
            <p><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleDateString('es-ES')}</p>
            <p><strong>Estado:</strong> <span style="background: #ffc107; color: #212529; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${pedido.estado}</span></p>
            <p><strong>Total:</strong> <strong style="color: #28a745;">₡${pedido.montoTotal.toFixed(2)}</strong></p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Datos del Cliente</h2>
            <p><strong>Nombre:</strong> ${cliente.nombre} ${cliente.apellido || ''}</p>
            <p><strong>Email:</strong> ${cliente.email}</p>
            ${cliente.telefono ? `<p><strong>Teléfono:</strong> ${cliente.telefono}</p>` : ''}
            ${cliente.direccion ? `
              <p><strong>Dirección de envío:</strong></p>
              <p style="margin-left: 20px; background: #e9ecef; padding: 10px; border-radius: 4px;">
                ${cliente.direccion.provincia || ''}, ${cliente.direccion.canton || ''}, ${cliente.direccion.distrito || ''}<br>
                ${cliente.direccion.barrio || ''} ${cliente.direccion.senas || ''}<br>
                ${cliente.direccion.referencia || ''}
              </p>
            ` : ''}
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Detalle de Productos</h2>
            ${items.map(item => `
              <div style="border-bottom: 1px solid #dee2e6; padding-bottom: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${item.nombre}</strong><br>
                    <small style="color: #6c757d;">Cantidad: ${item.cantidad} | Precio: ₡${item.precioUnitario.toFixed(2)}</small>
                  </div>
                  <strong style="color: #28a745;">₡${(item.cantidad * item.precioUnitario).toFixed(2)}</strong>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px;">Este es un mensaje automático del sistema de pedidos.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error al enviar correo de notificación:', error);
    return { success: false, error: error.message };
  }
};

export default {
  verifyEmailConnection,
  getAdminUsers,
  sendOrderConfirmationEmail,
  sendOrderNotificationEmail
};
