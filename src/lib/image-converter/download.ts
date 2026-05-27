// Helpers de descarga client-side (sin dependencias externas).

/** Dispara la descarga de un Blob con el nombre dado. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Liberar el object URL tras un breve margen para que el navegador procese la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Descarga varios archivos en secuencia con una pequeña pausa entre cada uno. */
export async function downloadMany(items: { blob: Blob; filename: string }[]): Promise<void> {
  for (const item of items) {
    downloadBlob(item.blob, item.filename)
    // Pausa para evitar que el navegador bloquee descargas múltiples simultáneas.
    await new Promise((r) => setTimeout(r, 250))
  }
}
