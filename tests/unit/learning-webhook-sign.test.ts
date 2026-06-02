import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicKey, createVerify } from 'node:crypto'
import { getLearningJwks, signLearningEvent, type LearningJwk } from '@/lib/learning/webhook-sign'

test('getLearningJwks returns a single RS256 key with required JWK fields', () => {
  const jwks = getLearningJwks()
  assert.equal(jwks.keys.length, 1)
  const key: LearningJwk = jwks.keys[0]!
  assert.equal(key.kty, 'RSA')
  assert.equal(key.alg, 'RS256')
  assert.equal(key.use, 'sig')
  assert.ok(key.kid.length > 0)
  assert.ok(key.n.length > 0)
  assert.ok(key.e.length > 0)
})

test('signed event verifies against the published public key', () => {
  const event = {
    event_id: 'evt_test_1',
    type: 'lesson.completed' as const,
    user_external_id: 'megatools:user_abc',
    org_id: 'org_xyz',
    payload: { course_id: 'c1', lesson_id: 'l1', xp: 50 },
    occurred_at: '2026-06-02T15:00:00.000Z',
  }
  const signed = signLearningEvent(event)
  assert.equal(signed.kid, 'megatools-learning-2026-06')

  const parts = signed.signature.split('.')
  assert.equal(parts.length, 3, 'expected JWS compact serialization')
  const [header, body, signatureB64] = parts
  if (!header || !body || !signatureB64) throw new Error('malformed jws')

  const jwk: LearningJwk = getLearningJwks().keys[0]!
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${header}.${body}`)
  verifier.end()
  const signatureBuf = Buffer.from(signatureB64, 'base64url')
  const ok = verifier.verify(publicKey, signatureBuf)
  assert.equal(ok, true, 'signature must verify under the published public key')
})

test('payload is encoded inside the token body', () => {
  const event = {
    event_id: 'evt_test_2',
    type: 'course.completed' as const,
    user_external_id: 'megatools:user_q',
    org_id: 'org_z',
    payload: { course_id: 'c9' },
    occurred_at: '2026-06-02T15:30:00.000Z',
  }
  const signed = signLearningEvent(event)
  const bodyPart = signed.signature.split('.')[1]
  if (!bodyPart) throw new Error('malformed jws')
  const body = JSON.parse(Buffer.from(bodyPart, 'base64url').toString('utf8'))
  assert.equal(body.event_id, event.event_id)
  assert.equal(body.type, 'course.completed')
  assert.equal(body.payload.course_id, 'c9')
  assert.equal(body.kid, signed.kid)
})
