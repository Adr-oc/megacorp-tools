'use server'

import { requireApp } from '@/lib/permissions/require-app'
import { analyzeDocumentInputSchema, type AnalyzeDocumentResult } from './schema'

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions'
const DEFAULT_MODEL = 'meta/llama-3.2-11b-vision-instruct'

function typeLabel(type: string): string {
  if (type === 'factura') return 'factura'
  if (type === 'recibo') return 'recibo'
  return 'documento general'
}

function buildPrompt(extractionType: string, manualText?: string): string {
  return `Sos un extractor seguro de datos para MegaTools. Analizá el ${typeLabel(
    extractionType,
  )} adjunto y devolvé únicamente un JSON válido, sin markdown, con esta forma:
{
  "resumen": "resumen breve en español",
  "proveedor": { "nombre": null, "nit": null, "direccion": null },
  "cliente": { "nombre": null, "nit": null, "direccion": null },
  "fechas": { "emision": null, "vencimiento": null, "otras": [] },
  "moneda": null,
  "totales": { "subtotal": null, "impuestos": null, "descuentos": null, "total": null },
  "items": [{ "descripcion": null, "cantidad": null, "precioUnitario": null, "total": null }],
  "observaciones": []
}
Reglas: no inventés datos; usá null cuando no aparezca; preservá NIT/identificadores tal como estén; si hay duda, agregala en observaciones.${
    manualText?.trim()
      ? `\n\nTexto extraído o pegado por el usuario:\n${manualText.trim().slice(0, 20_000)}`
      : ''
  }`
}

function tryPrettyJson(raw: string): { summary: string; jsonText: string } {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
  try {
    const parsed = JSON.parse(trimmed) as { resumen?: unknown }
    return {
      summary: typeof parsed.resumen === 'string' ? parsed.resumen : 'Extracción completada.',
      jsonText: JSON.stringify(parsed, null, 2),
    }
  } catch {
    return { summary: 'Extracción completada. Revisá el JSON/texto devuelto.', jsonText: trimmed }
  }
}

function demoExtraction(manualText?: string): AnalyzeDocumentResult {
  const text = manualText?.trim() ?? ''
  const totalMatch = text.match(/(?:total|monto)\s*[:\-]?\s*(?:Q|USD|US\$|\$)?\s*([\d,.]+)/i)
  const nitMatches = Array.from(text.matchAll(/\b(?:NIT|nit)\s*[:\-]?\s*([A-Z0-9\-]+)/g)).map((m) => m[1])
  const dateMatches = Array.from(text.matchAll(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g)).map((m) => m[0])
  const payload = {
    resumen: text
      ? 'Modo demo: extracción básica desde el texto pegado. Configurá NVIDIA_API_KEY para analizar imágenes.'
      : 'Falta configurar NVIDIA_API_KEY. Podés pegar texto manualmente para una extracción demo.',
    proveedor: { nombre: null, nit: nitMatches[0] ?? null, direccion: null },
    cliente: { nombre: null, nit: nitMatches[1] ?? null, direccion: null },
    fechas: { emision: dateMatches[0] ?? null, vencimiento: null, otras: dateMatches.slice(1) },
    moneda: text.match(/\bUSD\b|US\$|\$/i)?.[0] ?? (text.includes('Q') ? 'GTQ' : null),
    totales: { subtotal: null, impuestos: null, descuentos: null, total: totalMatch?.[1] ?? null },
    items: [],
    observaciones: [
      'Resultado local limitado: no se envió ningún archivo a NVIDIA porque la API key no está configurada.',
    ],
  }
  return { ok: true, configured: false, mode: 'demo', summary: payload.resumen, jsonText: JSON.stringify(payload, null, 2) }
}

export async function analyzeDocument(input: unknown): Promise<AnalyzeDocumentResult> {
  await requireApp('image-ai')

  const parsed = analyzeDocumentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, configured: Boolean(process.env.NVIDIA_API_KEY), mode: 'error', summary: 'Datos inválidos.', jsonText: '{}', error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) return demoExtraction(parsed.data.manualText)

  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
    { type: 'text', text: buildPrompt(parsed.data.extractionType, parsed.data.manualText) },
  ]

  for (const file of parsed.data.files) {
    if (!file.mimeType.startsWith('image/')) continue
    content.push({ type: 'image_url', image_url: { url: file.dataUrl } })
  }

  if (content.length === 1 && !parsed.data.manualText?.trim()) {
    return { ok: false, configured: true, mode: 'error', summary: 'Subí una imagen o pegá texto para analizar.', jsonText: '{}', error: 'Sin contenido para analizar' }
  }

  try {
    const response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_VISION_MODEL ?? DEFAULT_MODEL,
        messages: [{ role: 'user', content }],
        temperature: 0.1,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return { ok: false, configured: true, mode: 'error', summary: 'NVIDIA NIM rechazó la solicitud.', jsonText: '{}', error: detail.slice(0, 500) }
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content ?? '{}'
    const pretty = tryPrettyJson(raw)
    return { ok: true, configured: true, mode: 'nvidia', ...pretty }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al llamar NVIDIA NIM'
    return { ok: false, configured: true, mode: 'error', summary: 'No se pudo completar el análisis.', jsonText: '{}', error: message }
  }
}
