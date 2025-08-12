"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SchemaUploader } from "@/components/schema-uploader"
import { DynamicForm } from "@/components/dynamic-form"
import { FileText, Upload } from "lucide-react"
import { SchemaSelector } from "@/components/schema-selector"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/contexts/language-context"

// Update the component to include the schema selector
export default function Home() {
  const [parsedSchema, setParsedSchema] = useState<any>(null)
  const [schemaName, setSchemaName] = useState<string>("")
  const { t } = useLanguage()

  const handleSchemaSelection = (schema: any, name: string) => {
    setParsedSchema(schema)
    setSchemaName(name)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center relative">
          <div className="absolute top-0 right-0">
            <LanguageSwitcher />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("app.title")}</h1>
          <p className="text-lg text-gray-600">{t("app.description")}</p>
        </div>

        <SchemaSelector onSchemaSelected={handleSchemaSelection} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("upload.newSchema")}
            </CardTitle>
            <CardDescription>{t("upload.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SchemaUploader onSchemaParsed={setParsedSchema} onSchemaNameChange={setSchemaName} />
          </CardContent>
        </Card>

        {parsedSchema && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dynamic Form - {schemaName}
              </CardTitle>
              <CardDescription>
                {t('form.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicForm schema={parsedSchema} schemaName={schemaName} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
