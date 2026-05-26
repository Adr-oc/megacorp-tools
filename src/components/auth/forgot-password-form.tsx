'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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

const schema = z.object({
  email: z.email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          redirectTo: '/reset-password',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? 'No se pudo enviar el enlace')
        return
      }

      setSent(true)
    } catch {
      toast.error('Error al procesar la solicitud')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Si existe una cuenta con ese email, te enviamos instrucciones para recuperar la contraseña.
      </p>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@empresa.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </Button>
      </form>
    </Form>
  )
}
