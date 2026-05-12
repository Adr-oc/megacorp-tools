import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invitation, organization } from '@/lib/db/schema/auth'
import { eq } from 'drizzle-orm'

/**
 * GET /api/invitations?id=<invitationId>
 *
 * Public endpoint — returns only the fields needed to render the
 * accept-invitation form (email + org name). Never exposes internal IDs
 * or inviter details.
 *
 * Returns 200 + { email, organizationName } on success.
 * Returns 400 + { message } for invalid / expired / already-accepted invitations.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ message: 'Parámetro id requerido' }, { status: 400 })
  }

  const row = await db
    .select({
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(eq(invitation.id, id))
    .limit(1)

  const inv = row[0]

  if (!inv) {
    return NextResponse.json({ message: 'Invitación no encontrada' }, { status: 400 })
  }

  if (inv.status !== 'pending') {
    return NextResponse.json({ message: 'La invitación ya fue usada o cancelada' }, { status: 400 })
  }

  if (inv.expiresAt < new Date()) {
    return NextResponse.json({ message: 'La invitación expiró' }, { status: 400 })
  }

  return NextResponse.json({
    email: inv.email,
    organizationName: inv.organizationName,
  })
}
