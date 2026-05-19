'use server'

import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema/auth'

export async function markOnboardingComplete(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('No autenticado')
  await db
    .update(user)
    .set({ onboardedAt: new Date() })
    .where(eq(user.id, session.user.id))
  revalidatePath('/', 'layout')
}
