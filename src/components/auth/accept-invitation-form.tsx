'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
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

function extractToken(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return url.searchParams.get('token') || url.searchParams.get('id')
  } catch {
    return trimmed.length > 8 ? trimmed : null
  }
}

export function AcceptInvitationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [info, setInfo] = useState<InvitationInfo>(null)
  const [fetchDoneToken, setFetchDoneToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [manualInvite, setManualInvite] = useState('')
  const loadingInfo = token ? fetchDoneToken !== token : false

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '', confirm: '' },
  })

  useEffect(() => {
    if (!token) return

    let cancelled = false
    // Llamar al endpoint público que retorna email + org name.
    // No usamos /api/auth/organization/get-invitation porque requiere sesión activa.
    fetch(`/api/invitations?id=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        if (data && data.email && (data.organizationName ?? data.organization?.name)) {
          setInfo({
            email: data.email,
            organizationName: data.organizationName ?? data.organization.name,
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetchDoneToken(token)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  if (loadingInfo) {
    return <p className="text-sm text-muted-foreground">Cargando invitación…</p>
  }

  if (!token) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
          <p className="font-medium text-foreground">Abrí el enlace exacto de tu correo.</p>
          <p className="mt-1">
            Por seguridad, una invitación solo funciona con el token privado que viene en el
            email. Si llegaste desde la landing, pegá aquí el enlace completo de invitación.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="invite-link">
            Enlace o token de invitación
          </label>
          <Input
            id="invite-link"
            value={manualInvite}
            onChange={(event) => setManualInvite(event.target.value)}
            placeholder="Pegá el enlace completo del correo"
          />
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={() => {
            const nextToken = extractToken(manualInvite)
            if (!nextToken) {
              toast.error('Pegá el enlace completo de invitación')
              return
            }
            router.push(`/accept-invitation?token=${encodeURIComponent(nextToken)}`)
          }}
        >
          Continuar con mi invitación
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          Invitación inválida, expirada o ya utilizada. Pedile a tu admin que te envíe una
          invitación nueva.
        </div>
        <Link href="/login" className="block">
          <Button variant="outline" className="w-full">
            Ir a iniciar sesión
          </Button>
        </Link>
      </div>
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
      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        Te invitaron a unirte a <strong className="text-foreground">{info.organizationName}</strong>{' '}
        con el email <strong className="text-foreground">{info.email}</strong>.
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
