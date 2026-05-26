import { Resend } from 'resend'
import { env } from '@/lib/env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const FROM = env.EMAIL_FROM ?? 'no-reply@megatools.local'

type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Envía un correo transaccional vía Resend.
 *
 * Si RESEND_API_KEY no está configurada, cae a console.log (modo dev/staging
 * sin proveedor). Esto mantiene el flujo de auth funcional sin email real.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!resend) {
    console.log(`[email:noop] to=${to} subject="${subject}" (RESEND_API_KEY ausente)`)
    return
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text })
  if (error) {
    console.error(`[email:error] to=${to} subject="${subject}":`, error)
    throw new Error(`No se pudo enviar el correo a ${to}: ${error.message}`)
  }
}

/** Layout HTML mínimo, marca MEGACORP (cream paper / navy ink). */
function layout(heading: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;background:#f5f1e8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2238">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fffdf7;border:1px solid #e4ddcc;border-radius:12px;padding:40px">
        <tr><td>
          <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a7f66;margin:0 0 8px">MegaTools · MEGACORP</p>
          <h1 style="font-size:22px;margin:0 0 16px;color:#1a2238">${heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#3a4256">${body}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="border-radius:8px;background:#d8a93a">
              <a href="${cta.url}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#1a2238;text-decoration:none">${cta.label}</a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#8a7f66;margin:0;word-break:break-all">Si el botón no funciona, copiá este enlace:<br>${cta.url}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function verificationEmail(url: string): { subject: string; html: string; text: string } {
  return {
    subject: 'Verificá tu cuenta en MegaTools',
    html: layout(
      'Verificá tu correo',
      '<p>Para activar tu cuenta en el portal de herramientas internas del grupo MEGACORP, confirmá tu dirección de correo.</p>',
      { label: 'Verificar mi cuenta', url }
    ),
    text: `Verificá tu cuenta en MegaTools abriendo este enlace:\n${url}`,
  }
}

export function invitationEmail(orgName: string, url: string): { subject: string; html: string; text: string } {
  return {
    subject: `Te invitaron a ${orgName} en MegaTools`,
    html: layout(
      `Invitación a ${orgName}`,
      `<p>Te invitaron a unirte a <strong>${orgName}</strong> en MegaTools, el portal de herramientas internas del grupo MEGACORP.</p>`,
      { label: 'Aceptar invitación', url }
    ),
    text: `Te invitaron a ${orgName} en MegaTools. Aceptá la invitación:\n${url}`,
  }
}

export function magicLinkEmail(url: string): { subject: string; html: string; text: string } {
  return {
    subject: 'Tu enlace de acceso a MegaTools',
    html: layout(
      'Iniciá sesión',
      '<p>Usá este enlace para iniciar sesión en MegaTools. Caduca en unos minutos y solo funciona una vez.</p>',
      { label: 'Iniciar sesión', url }
    ),
    text: `Iniciá sesión en MegaTools con este enlace:\n${url}`,
  }
}
