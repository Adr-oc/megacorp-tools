'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'

const schema = z
  .object({
    name: z.string().min(1, 'Requerido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })

type FormValues = z.infer<typeof schema>

type InvitationInfo = {
  email: string
  organizationName: string
} | null

export function AcceptInvitationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [info, setInfo] = useState<InvitationInfo>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '', confirm: '' },
  })

  useEffect(() => {
    if (!token) {
      setLoadingInfo(false)
      return
    }
    // Llamar al endpoint público que retorna email + org name.
    // No usamos /api/auth/organization/get-invitation porque requiere sesión activa.
    fetch(`/api/invitations?id=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setLoadingInfo(false)
          return
        }
        const data = await res.json()
        if (data && data.email && (data.organizationName ?? data.organization?.name)) {
          setInfo({
            email: data.email,
            organizationName: data.organizationName ?? data.organization.name,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInfo(false))
  }, [token])

  if (loadingInfo) {
    return <p className="text-sm text-muted-foreground">Cargando invitación…</p>
  }

  if (!token || !info) {
    return (
      <p className="text-sm text-destructive">
        Invitación inválida o expirada. Pedile a tu admin que te invite de nuevo.
      </p>
    )
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)

    // Paso 1: sign-up
    const signUpRes = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: info!.email,
        password: values.password,
        name: values.name,
      }),
    })

    if (!signUpRes.ok) {
      setIsLoading(false)
      const body = await signUpRes.json().catch(() => ({}))
      toast.error(body.message ?? 'No se pudo crear la cuenta')
      return
    }

    setIsLoading(false)

    // Paso 2: la invitación se acepta DESPUÉS de verificar el email.
    // Better Auth requiere emailVerified=true antes de acceptInvitation.
    // Guardamos el token en sessionStorage para retomarlo luego.
    try {
      sessionStorage.setItem('pendingInvitationToken', token!)
    } catch {
      // sessionStorage no disponible (SSR guard)
    }

    toast.success('Revisá tu email para verificar la cuenta')
    router.push('/verify-email-pending')
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Te invitaron a unirte a <strong>{info.organizationName}</strong> con el email{' '}
        <strong>{info.email}</strong>.
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tu nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creando cuenta…' : 'Aceptar invitación'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
