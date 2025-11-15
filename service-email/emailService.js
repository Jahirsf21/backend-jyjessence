import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar dotenv para leer desde la carpeta database/
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../database/.env') });

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

// Verificar conexión al iniciar
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Conexión con servidor de correo establecida');
  } catch (error) {
    console.error('❌ Error al conectar con servidor de correo:', error);
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
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6c757d;">¿Tienes preguntas? Contáctanos en support@jyjessence.com</p>
            <p style="color: #6c757d; font-size: 14px;">Este es un mensaje automático, por favor no responder.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de confirmación enviado al cliente:', cliente.email);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error al enviar correo de confirmación:', error);
    return { success: false, error: error.message };
  }
};

// Función para enviar correo de notificación a la tienda
export const sendOrderNotificationEmail = async (pedido, cliente, items) => {
  try {
    const itemsList = items.map(item => 
      `${item.cantidad}x ${item.nombre} - ₡${(item.cantidad * item.precioUnitario).toFixed(2)}`
    ).join('\n');

    const mailOptions = {
      from: `"JYJ Essence" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviar al mismo correo de la tienda
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
    console.log('✅ Correo de notificación enviado a la tienda');
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error al enviar correo de notificación:', error);
    return { success: false, error: error.message };
  }
};

export default {
  verifyEmailConnection,
  sendOrderConfirmationEmail,
  sendOrderNotificationEmail
};
