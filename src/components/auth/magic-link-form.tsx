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
import { authClient } from '@/lib/auth/client'

const schema = z.object({
  email: z.email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const { error } = await authClient.signIn.magicLink({ email: values.email })
    setIsLoading(false)

    if (error) {
      toast.error(error.message ?? 'No se pudo enviar el enlace')
      return
    }

    setSent(true)
    toast.success('Revisá tu email')
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Te enviamos un enlace a tu email. Clickealo para ingresar.
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
          {isLoading ? 'Enviando…' : 'Enviarme un enlace mágico'}
        </Button>
      </form>
    </Form>
  )
}
