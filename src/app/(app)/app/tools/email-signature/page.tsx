import { requireApp } from '@/lib/permissions/require-app'
import { getTemplate, getUserData } from '@/lib/email-signature/actions'
import { EmailSignatureApp } from '@/components/email-signature/email-signature-app'

export default async function EmailSignaturePage() {
  const { role } = await requireApp('email-signature')
  const isAdmin = role === 'admin' || role === 'owner'

  const [template, data] = await Promise.all([getTemplate(), getUserData()])

  return (
    <EmailSignatureApp
      isAdmin={isAdmin}
      initialTemplate={template}
      initialData={data}
    />
  )
}
