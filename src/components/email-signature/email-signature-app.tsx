'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DEFAULT_TEMPLATE_HTML,
  type SignatureData,
  type SignatureField,
  type SignatureTemplate,
} from '@/lib/email-signature/schema'
import { renderSignature, renderSignatureText } from '@/lib/email-signature/render'
import { saveUserData } from '@/lib/email-signature/actions'
import { TemplateEditor } from './template-editor'
import { UserDataForm } from './user-data-form'
import { SignaturePreview } from './signature-preview'

type Props = {
  isAdmin: boolean
  initialTemplate: SignatureTemplate | null
  initialData: SignatureData
}

const EMPTY_TEMPLATE: SignatureTemplate = {
  html: DEFAULT_TEMPLATE_HTML,
  images: [],
  editableFields: ['nombre', 'puesto', 'descripcion', 'correo', 'telefono'],
  fixedValues: {},
}

export function EmailSignatureApp({ isAdmin, initialTemplate, initialData }: Props) {
  const [template, setTemplate] = useState<SignatureTemplate>(
    initialTemplate ?? EMPTY_TEMPLATE
  )
  const [values, setValues] = useState<Partial<Record<SignatureField, string>>>(
    initialData.values ?? {}
  )
  const [savingData, setSavingData] = useState(false)
  const [tab, setTab] = useState(isAdmin && !initialTemplate ? 'admin' : 'mine')

  const hasTemplate = initialTemplate !== null

  const previewHtml = useMemo(
    () => renderSignature({ template, userValues: values }),
    [template, values]
  )
  const previewText = useMemo(
    () => renderSignatureText({ template, userValues: values }),
    [template, values]
  )

  async function onSaveData() {
    setSavingData(true)
    try {
      const res = await saveUserData({ values })
      if (res.ok) toast.success('Tus datos de firma se guardaron')
      else toast.error(res.error)
    } catch {
      toast.error('Error al guardar tus datos')
    } finally {
      setSavingData(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Firmas de correo</h1>
        <p className="text-sm text-muted-foreground">
          Generá tu firma corporativa a partir de la plantilla de tu organización.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="mine">Mi firma</TabsTrigger>
          {isAdmin ? <TabsTrigger value="admin">Plantilla (admin)</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="mine">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tus datos</CardTitle>
                <CardDescription>
                  Completá los campos habilitados por tu administrador.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasTemplate ? (
                  <>
                    <UserDataForm
                      template={template}
                      values={values}
                      onChange={setValues}
                    />
                    <Button onClick={onSaveData} disabled={savingData}>
                      <Save className="size-4" />
                      {savingData ? 'Guardando…' : 'Guardar mis datos'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tu administrador aún no configuró la plantilla de firma.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vista previa</CardTitle>
                <CardDescription>Así se verá tu firma al pegarla.</CardDescription>
              </CardHeader>
              <CardContent>
                {hasTemplate ? (
                  <SignaturePreview html={previewHtml} text={previewText} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin plantilla disponible todavía.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="admin">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Editor de plantilla</CardTitle>
                  <CardDescription>
                    Definí el diseño de la firma para toda la organización.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateEditor template={template} onChange={setTemplate} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vista previa</CardTitle>
                  <CardDescription>
                    Con tus datos actuales como ejemplo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignaturePreview html={previewHtml} text={previewText} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
