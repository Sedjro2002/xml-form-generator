"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, CheckCircle, AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { parseXSDSchema } from "@/lib/xsd-parser"

interface SchemaUploaderProps {
  onSchemaParsed: (schema: any) => void
  onSchemaNameChange: (name: string) => void
}

export function SchemaUploader({ onSchemaParsed, onSchemaNameChange }: SchemaUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  // Automatically parse schema when file is selected
  useEffect(() => {
    if (file) {
      handleUpload()
    }
  }, [file])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith(".xsd") || selectedFile.name.endsWith(".xml")) {
        setFile(selectedFile)
        setError("")
        setSuccess(false)
      } else {
        setError(t("upload.validFile"))
        setFile(null)
      }
    }
  }

  const saveSchema = async (filename: string, content: string) => {
    try {
      // Save the schema content in localStorage using the filename as the key
      localStorage.setItem(`schema:${filename}`, content)
    } catch (error) {
      console.warn("Error saving schema to localStorage:", error)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError("")

    try {
      const content = await file.text()
      const parsedSchema = parseXSDSchema(content)

      // Save the schema
      await saveSchema(file.name, content)

      onSchemaParsed(parsedSchema)
      onSchemaNameChange(file.name.replace(/\.(xsd|xml)$/, ""))
      setSuccess(true)

      // Scroll to form section after successful upload
      setTimeout(() => {
        const formSection = document.querySelector("[data-form-section]")
        if (formSection) {
          formSection.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse schema")
    } finally {
      setIsLoading(false)
    }
  }

  const loadExampleSchema = async (schemaPath: string, schemaName: string) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(schemaPath)
      if (!response.ok) {
        throw new Error("Failed to load example schema")
      }

      const content = await response.text()
      const parsedSchema = parseXSDSchema(content)

      // Save the example schema
      const filename = `${schemaName.toLowerCase().replace(/\s+/g, "_")}.xsd`
      await saveSchema(filename, content)

      onSchemaParsed(parsedSchema)
      onSchemaNameChange(schemaName)
      setSuccess(true)

      // Scroll to form section after successful upload
      setTimeout(() => {
        const formSection = document.querySelector("[data-form-section]")
        if (formSection) {
          formSection.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load example schema")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="schema-file">{t("upload.selectFile")}</Label>
          <div className="mt-2">
            <Input
              id="schema-file"
              type="file"
              accept=".xsd,.xml"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="cursor-pointer"
              disabled={isLoading}
            />
          </div>
        </div>

        {file && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{file.name}</span>
                <span className="text-xs text-blue-600">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  <span className="text-sm text-blue-600">{t("upload.parsing")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>


      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {t("upload.success")} You can now fill out the form below.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
