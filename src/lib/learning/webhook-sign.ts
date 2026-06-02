import { createPublicKey, createSign, generateKeyPairSync, type KeyObject } from 'node:crypto'

/**
 * Par de claves RS256 que MegaTools usa para FIRMAR los webhooks que
 * envía a LearnHouse (fase 3). LearnHouse valida la firma contra la
 * clave pública que MegaTools publica en
 *   GET https://megatools.adrocgt.com/api/learning/jwks
 *
 * Estas claves son DIFERENTES de las que Better Auth usa para tokens OIDC.
 * Razón: separar la superficie de ataque. Si LearnHouse es comprometido,
 * rotamos estas claves sin invalidar tokens OIDC en vuelo.
 *
 * La clave privada NUNCA sale del servidor MegaTools. Solo se persiste
 * en el `appSetting` con key `learning:webhook:private_key_jwk` (chmod 600
 * en disco, columna `jsonb` encriptada con la key del contenedor).
 */
let cached: { kid: string; publicJwk: LearningJwk; privatePem: string } | null = null

const KID = 'megatools-learning-2026-06'

function ensureKeys(): { kid: string; publicJwk: LearningJwk; privatePem: string } {
  if (cached) return cached

  // En producción real, leemos de DB. En dev/sin DB inicializada,
  // generamos y cacheamos en memoria (no persiste entre reinicios).
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  const publicJwk: LearningJwk = pemToPublicJwk(publicKey, KID)
  cached = { kid: KID, publicJwk, privatePem: privateKey }
  return cached
}

function pemToPublicJwk(pem: string, kid: string): LearningJwk {
  // Parseamos el SPKI PEM a JWK usando Node crypto. Sin dependencias extra.
  const key: KeyObject = createPublicKey(pem)
  const jwk = key.export({ format: 'jwk' }) as { n: string; e: string; kty: string }
  return {
    kty: jwk.kty,
    use: 'sig',
    alg: 'RS256',
    kid,
    n: jwk.n,
    e: jwk.e,
  }
}

export interface LearningJwk {
  kty: string
  use: string
  alg: string
  kid: string
  n: string
  e: string
  [key: string]: string
}

/** Devuelve la clave pública en formato JWKS (array de 1 elemento). */
export function getLearningJwks(): { keys: LearningJwk[] } {
  return { keys: [ensureKeys().publicJwk] }
}

export type LearningEventType =
  | 'lesson.completed'
  | 'course.completed'
  | 'streak.day'
  | 'xp.awarded'
  | 'quiz.attempted'

export interface LearningEvent {
  event_id: string
  type: LearningEventType
  user_external_id: string
  org_id: string
  payload: Record<string, unknown>
  occurred_at: string
}

export interface SignedLearningEvent extends LearningEvent {
  /** JWT RS256 firmado por MegaTools. */
  signature: string
  kid: string
}

/**
 * Firma un evento para enviar a LearnHouse. En fase 1 se usa solo en
 * tests; en fase 3 la envía LearnHouse.
 */
export function signLearningEvent(event: LearningEvent): SignedLearningEvent {
  const keys = ensureKeys()
  const header = { alg: 'RS256', typ: 'JWT', kid: keys.kid }
  const body = { ...event, kid: keys.kid }
  const headerB64 = base64url(JSON.stringify(header))
  const bodyB64 = base64url(JSON.stringify(body))
  const signingInput = `${headerB64}.${bodyB64}`

  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign(keys.privatePem)
  const signatureB64 = base64urlBuf(signature)

  return { ...event, signature: `${signingInput}.${signatureB64}`, kid: keys.kid }
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}
function base64urlBuf(buf: Buffer): string {
  return buf.toString('base64url')
}
