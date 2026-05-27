import { requireApp } from '@/lib/permissions/require-app'
import { getTemplates, getUserData } from '@/lib/email-signature/actions'
import { EmailSignatureApp } from '@/components/email-signature/email-signature-app'

export default async function EmailSignaturePage() {
  const { role, isSuperAdmin } = await requireApp('email-signature')
  const isAdmin = isSuperAdmin || role === 'admin' || role === 'owner'

  const [templates, data] = await Promise.all([getTemplates(), getUserData()])

  return (
    <EmailSignatureApp
      isAdmin={isAdmin}
      initialTemplates={templates}
      initialData={data}
    />
  )
}
