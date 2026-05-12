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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  user: { name: string | null; email: string }
}

export function ProfileForm({ user }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name ?? '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const res = await fetch('/api/auth/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name }),
    })
    setIsLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.message ?? 'No se pudo actualizar')
      return
    }
    toast.success('Perfil actualizado')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Email</FormLabel>
          <Input value={user.email} disabled className="mt-2" />
          <FormDescription className="mt-1">
            El email no se puede cambiar desde acá.
          </FormDescription>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  )
}
