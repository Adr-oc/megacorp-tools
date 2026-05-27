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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type SignatureData,
  type SignatureField,
  type SignatureTemplate,
} from '@/lib/email-signature/schema'
import { renderSignature, renderSignatureText } from '@/lib/email-signature/render'
import { saveUserData } from '@/lib/email-signature/actions'
import { TemplateManager } from './template-manager'
import { UserDataForm } from './user-data-form'
import { SignaturePreview } from './signature-preview'

type Props = {
  isAdmin: boolean
  initialTemplates: SignatureTemplate[]
  initialData: SignatureData
}

export function EmailSignatureApp({
  isAdmin,
  initialTemplates,
  initialData,
}: Props) {
  const [templates, setTemplates] = useState<SignatureTemplate[]>(initialTemplates)
  const [values, setValues] = useState<Partial<Record<SignatureField, string>>>(
    initialData.values ?? {}
  )
  // Plantilla seleccionada por el usuario (para usar/copiar).
  const [userSelectedId, setUserSelectedId] = useState<string | null>(() => {
    const saved = initialData.selectedTemplateId
    if (saved && initialTemplates.some((t) => t.id === saved)) return saved
    return initialTemplates[0]?.id ?? null
  })
  // Plantilla seleccionada en el editor admin.
  const [adminSelectedId, setAdminSelectedId] = useState<string | null>(
    initialTemplates[0]?.id ?? null
  )
  const [savingData, setSavingData] = useState(false)
  const [tab, setTab] = useState(
    isAdmin && initialTemplates.length === 0 ? 'admin' : 'mine'
  )

  const hasTemplates = templates.length > 0

  // Plantilla elegida por el usuario (validada contra las existentes).
  const userTemplate = useMemo(
    () =>
      templates.find((t) => t.id === userSelectedId) ?? templates[0] ?? null,
    [templates, userSelectedId]
  )

  // Plantilla mostrada en el preview del admin.
  const adminTemplate = useMemo(
    () =>
      templates.find((t) => t.id === adminSelectedId) ?? templates[0] ?? null,
    [templates, adminSelectedId]
  )

  const userPreviewHtml = useMemo(
    () =>
      userTemplate
        ? renderSignature({ template: userTemplate, userValues: values })
        : '',
    [userTemplate, values]
  )
  const userPreviewText = useMemo(
    () =>
      userTemplate
        ? renderSignatureText({ template: userTemplate, userValues: values })
        : '',
    [userTemplate, values]
  )

  const adminPreviewHtml = useMemo(
    () =>
      adminTemplate
        ? renderSignature({ template: adminTemplate, userValues: values })
        : '',
    [adminTemplate, values]
  )
  const adminPreviewText = useMemo(
    () =>
      adminTemplate
        ? renderSignatureText({ template: adminTemplate, userValues: values })
        : '',
    [adminTemplate, values]
  )

  async function onSaveData() {
    setSavingData(true)
    try {
      const res = await saveUserData({
        values,
        selectedTemplateId: userTemplate?.id,
      })
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
          Generá tu firma corporativa eligiendo una de las plantillas de tu
          organización.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="mine">Mi firma</TabsTrigger>
          {isAdmin ? <TabsTrigger value="admin">Plantillas (admin)</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="mine">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tus datos</CardTitle>
                <CardDescription>
                  Elegí una plantilla y completá los campos habilitados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasTemplates && userTemplate ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label>Elegí tu plantilla</Label>
                      <Select
                        value={userTemplate.id}
                        onValueChange={(v) => setUserSelectedId(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Elegí una plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name || 'Sin nombre'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <UserDataForm
                      template={userTemplate}
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
                    Tu administrador aún no configuró plantillas de firma.
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
                {hasTemplates && userTemplate ? (
                  <SignaturePreview html={userPreviewHtml} text={userPreviewText} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin plantillas disponibles todavía.
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
                  <CardTitle>Editor de plantillas</CardTitle>
                  <CardDescription>
                    Definí hasta 6 plantillas de firma para toda la organización.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateManager
                    templates={templates}
                    onChange={setTemplates}
                    selectedId={adminSelectedId}
                    onSelect={setAdminSelectedId}
                  />
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
                  {adminTemplate ? (
                    <SignaturePreview
                      html={adminPreviewHtml}
                      text={adminPreviewText}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Creá una plantilla para ver la vista previa.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
