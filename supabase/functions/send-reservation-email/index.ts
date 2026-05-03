import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { record } = await req.json()

    // Extraemos los datos de la reservación
    const { emailInvitado, nombreInvitado, folio, fechaPrincipal, horaPrincipal } = record

    // URL de tu aplicación en Netlify (la ruta que crearemos en Angular)
    const baseUrl = "https://primereserve.netlify.app/confirmar-reserva";

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Prime Reserve <onboarding@resend.dev>',
        to: [emailInvitado],
        subject: `⚠️ Acción Requerida: Confirma tu mesa - Folio: ${folio}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 25px; color: #333;">
            <h2 style="color: #2c3e50; text-align: center;">¡Hola ${nombreInvitado}!</h2>
            <p style="font-size: 16px; line-height: 1.6; text-align: center;">
              Tu solicitud de reserva para el día <strong>${new Date(fechaPrincipal).toLocaleDateString('es-MX')}</strong> a las <strong>${horaPrincipal}</strong> ha sido recibida.
            </p>
            
            <p style="text-align: center; font-weight: bold; margin-top: 20px;">
              ¿Confirmas tu asistencia?
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <!-- Botón Confirmar -->
              <a href="${baseUrl}?folio=${folio}&accion=confirmar" 
                style="background-color: #2ecc71; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 10px;">
                SÍ, ASISTIRÉ
              </a>
              
              <!-- Botón Cancelar -->
              <a href="${baseUrl}?folio=${folio}&accion=cancelar" 
                style="background-color: #e74c3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 10px;">
                NO PODRÉ IR
              </a>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-size: 14px;">
              <p style="margin: 0;"><strong>Folio de reservación:</strong> ${folio}</p>
              <p style="margin: 5px 0 0 0; color: #7f8c8d;">* Si no confirmas, tu mesa podría ser liberada automáticamente.</p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})