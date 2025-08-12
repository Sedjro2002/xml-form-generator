"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, AlertCircle, CheckCircle, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/contexts/language-context"

interface XmlImporterProps {
  schema: any
  onDataImported: (data: any) => void
  onClearForm: () => void
  hasFormData: boolean
}

export function XmlImporter({ schema, onDataImported, onClearForm, hasFormData }: XmlImporterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.toLowerCase().endsWith(".xml")) {
        setFile(selectedFile)
        setError("")
        setSuccess(false)
        handleImport(selectedFile)
      } else {
        setError(t("import.validFile"))
        setFile(null)
      }
    }
  }

  const parseXmlToFormData = (xmlContent: string): any => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml")

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror")
    if (parseError) {
      throw new Error("Invalid XML format")
    }

    // Find the root element that matches our schema
    const rootElement = xmlDoc.querySelector(schema.name)
    if (!rootElement) {
      throw new Error(t("import.noMatch"))
    }

    return parseElementToFormData(rootElement, schema)
  }

  const parseElementToFormData = (xmlElement: Element, schemaElement: any): any => {
    const formData: any = {}

    if (schemaElement.complexType) {
      // Parse attributes
      if (schemaElement.attributes) {
        schemaElement.attributes.forEach((attr: any) => {
          const attrValue = xmlElement.getAttribute(attr.name)
          if (attrValue !== null) {
            formData[`@${attr.name}`] = attrValue
          }
        })
      }

      // Parse child elements
      if (schemaElement.children) {
        schemaElement.children.forEach((child: any) => {
          if (child.multiple) {
            // Handle multiple elements (arrays)
            const childElements = xmlElement.querySelectorAll(`:scope > ${child.name}`)
            if (childElements.length > 0) {
              formData[child.name] = Array.from(childElements).map((childEl) => {
                if (child.complexType) {
                  return parseElementToFormData(childEl, child)
                } else {
                  return getElementTextContent(childEl)
                }
              })
            }
          } else {
            // Handle single elements
            const childElement = xmlElement.querySelector(`:scope > ${child.name}`)
            if (childElement) {
              if (child.complexType) {
                formData[child.name] = parseElementToFormData(childElement, child)
              } else {
                formData[child.name] = getElementTextContent(childElement)
              }
            }
          }
        })
      }
    } else {
      // Simple element - return text content
      return getElementTextContent(xmlElement)
    }

    return formData
  }

  const getElementTextContent = (element: Element): string => {
    // Check if content is wrapped in CDATA
    const cdataMatch = element.textContent?.match(/^\s*<!\[CDATA\[(.*?)\]\]>\s*$/s)
    if (cdataMatch) {
      return cdataMatch[1]
    }
    return element.textContent?.trim() || ""
  }

  const handleImport = async (file: File) => {
    setIsLoading(true)
    setError("")
    setSuccess(false)

    try {
      const content = await file.text()
      const parsedData = parseXmlToFormData(content)

      // Structure the data to match the form's expected format
      const formData = {
        [schema.name]: parsedData,
      }

      onDataImported(formData)
      setSuccess(true)

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setFile(null)
    } catch (err) {
      console.error("XML import error:", err)
      setError(err instanceof Error ? err.message : t("import.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearForm = () => {
    onClearForm()
    setShowClearDialog(false)
    setSuccess(false)
    setError("")
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("import.title")}
          </CardTitle>
          <p className="text-sm text-gray-600">{t("import.description")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="xml-import-file">{t("import.selectFile")}</Label>
              <div className="mt-2">
                <Input
                  id="xml-import-file"
                  type="file"
                  accept=".xml"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="cursor-pointer"
                  disabled={isLoading}
                />
              </div>
            </div>
            {hasFormData && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setShowClearDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("import.clearForm")}
                </Button>
              </div>
            )}
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
                    <span className="text-sm text-blue-600">{t("import.parsing")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{t("import.success")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Clear form confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("import.clearForm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("import.confirmClear")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearForm} className="bg-red-600 hover:bg-red-700">
              {t("import.clearForm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
