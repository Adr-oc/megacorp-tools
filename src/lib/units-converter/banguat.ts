'use server'

// Consulta el tipo de cambio de referencia del Banguat vía su web service SOAP.
// Endpoint: https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx
// Operación: TipoCambioDia -> XML con <referencia> = quetzales por dólar.
// La llamada se hace desde el servidor para evitar CORS. El valor es diario,
// por eso cacheamos con revalidate. Ante cualquier fallo devolvemos un error
// controlado para no romper la herramienta.

export type BanguatRate =
  | { ok: true; referencia: number; fecha: string }
  | { ok: false; error: string }

const WS_URL = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx'

const SOAP_BODY = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TipoCambioDia xmlns="http://www.banguat.gob.gt/variables/ws/" />
  </soap:Body>
</soap:Envelope>`

function extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'))
  return match?.[1]?.trim()
}

export async function getBanguatRate(): Promise<BanguatRate> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(WS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://www.banguat.gob.gt/variables/ws/TipoCambioDia',
      },
      body: SOAP_BODY,
      signal: controller.signal,
      // Tasa diaria: cacheamos 1 hora.
      next: { revalidate: 3600 },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return { ok: false, error: `El web service respondió ${res.status}.` }
    }

    const xml = await res.text()
    const referenciaRaw = extractTag(xml, 'referencia')
    const fecha = extractTag(xml, 'fecha') ?? ''

    if (!referenciaRaw) {
      return { ok: false, error: 'No se encontró la tasa de referencia en la respuesta.' }
    }

    const referencia = Number(referenciaRaw)
    if (!Number.isFinite(referencia) || referencia <= 0) {
      return { ok: false, error: 'La tasa recibida no es válida.' }
    }

    return { ok: true, referencia, fecha }
  } catch {
    return { ok: false, error: 'No se pudo contactar el web service del Banguat.' }
  }
}
