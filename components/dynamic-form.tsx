"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Copy,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { BulkUpload } from "@/components/bulk-upload"
import { ArrayExport } from "@/components/array-export"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { JSX } from "react/jsx-runtime"
import { useLanguage } from "@/contexts/language-context"
import { XmlImporter } from "@/components/xml-importer"
import { getValueByPath, setValueByPath } from "@/lib/form-data"
import { validateFormData } from "@/lib/validation"
import { generateXml, isCdataEnabled } from "@/lib/xml"
import type { ElementDef } from "@/lib/xsd-parser"
import type { CdataSettings, Errors } from "@/lib/types"

interface DynamicFormProps {
  schema: ElementDef
  schemaName: string
}

export function DynamicForm({ schema, schemaName }: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [xmlPreview, setXmlPreview] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  // Track CDATA settings for each field
  const [cdataSettings, setCdataSettings] = useState<CdataSettings>({})
  // Track bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState<string | null>(null)
  // Track collapsed state for array sections only
  const [isCollapsed, setIsCollapsed] = useState<Record<string, boolean>>({})

  const { t } = useLanguage()

  const updateFormData = (path: string, value: any) => {
    setFormData((prev) => setValueByPath(prev, path, value))

    // Clear error for this field
    const newErrors = { ...errors }
    delete newErrors[path]
    setErrors(newErrors)

    // Clear XML preview when form data changes
    if (xmlPreview) {
      setXmlPreview(null)
      setShowPreview(false)
    }
  }

  const addArrayItem = (path: string, element: any) => {
    const currentArray = getValueByPath(formData, path) || []
    const newItem = element.complexType ? {} : ""
    updateFormData(path, [...currentArray, newItem])
  }

  const removeArrayItem = (path: string, index: number) => {
    const currentArray = getValueByPath(formData, path) || []
    const newArray = currentArray.filter((_: any, i: number) => i !== index)
    updateFormData(path, newArray)
  }

  // Handle bulk data import with CDATA settings
  const handleBulkImport = (path: string, importedData: any[], cdataColumns: string[]) => {
    updateFormData(path, importedData)

    // Apply CDATA settings for bulk imported data
    const newCdataSettings = { ...cdataSettings }

    importedData.forEach((_, index) => {
      cdataColumns.forEach((column) => {
        const fieldPath = `${path}.${index}.${column}`
        newCdataSettings[fieldPath] = true
      })
    })

    setCdataSettings(newCdataSettings)
    setShowBulkUpload(null)
  }

  // Toggle CDATA setting for a field
  const toggleCdata = (path: string) => {
    setCdataSettings((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))

    // Clear XML preview when CDATA settings change
    if (xmlPreview) {
      setXmlPreview(null)
      setShowPreview(false)
    }
  }

  // Add this function to handle imported data:
  const handleXmlImport = (importedData: any) => {
    setFormData(importedData)
    setErrors({}) // Clear any existing errors
    setGeneralError(null)
    // Clear XML preview when new data is imported
    if (xmlPreview) {
      setXmlPreview(null)
      setShowPreview(false)
    }
  }

  // Add this function to clear the form
  const handleClearForm = () => {
    setFormData({})
    setErrors({})
    setGeneralError(null)
    setCdataSettings({})
    if (xmlPreview) {
      setXmlPreview(null)
      setShowPreview(false)
    }
  }

  // Add this function to check if form has data
  const hasFormData = (): boolean => {
    return (
      Object.keys(formData).length > 0 &&
      Object.values(formData).some((value) => value !== null && value !== undefined && value !== "")
    )
  }

  const handleSubmit = () => {
    setErrors({})
    setGeneralError(null)

    const { errors: newErrors, isValid } = validateFormData(schema, formData, t)
    setErrors(newErrors)

    if (!isValid) return

    try {
      const rootData = formData[schema.name] || {}
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n${generateXml(schema, rootData, cdataSettings, 0, schema.name)}`

      // Set XML preview and show it
      setXmlPreview(xmlContent)
      setShowPreview(true)
    } catch (error) {
      console.error("XML generation error:", error)
      setGeneralError(t("xml.generationError"))
    }
  }

  const downloadXml = () => {
    if (!xmlPreview) return

    const blob = new Blob([xmlPreview], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${schemaName.toLowerCase().replace(/\s+/g, "_")}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyXmlToClipboard = () => {
    if (!xmlPreview) return

    navigator.clipboard
      .writeText(xmlPreview)
      .then(() => {
        // alert(t("xml.copied"))
        console.log(t("xml.copied"))
      })
      .catch((err) => {
        console.error("Failed to copy XML:", err)
      })
  }

  // Add a visual indicator in the form for fields that will use CDATA
  const renderFormField = (element: any, path = "", arrayIndex?: number): JSX.Element => {
    const currentPath =
      arrayIndex !== undefined ? `${path}.${arrayIndex}` : path ? `${path}.${element.name}` : element.name

    const value = getValueByPath(formData, currentPath)
    const error = errors[currentPath]

    if (element.complexType) {
      return (
        <Card key={currentPath} className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              {element.name}
              {element.multiple && arrayIndex !== undefined && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem(path, arrayIndex)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            {element.required && <span className="text-sm text-red-600"> {t("form.required")}</span>}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Render attributes */}
            {element.attributes &&
              element.attributes.length > 0 &&
              element.attributes.map((attr: any) => (
                <div key={attr.name}>
                  <Label htmlFor={`${currentPath}.@${attr.name}`}>
                    {attr.name} {attr.required && <span className="text-red-600">*</span>}
                  </Label>
                  <Input
                    id={`${currentPath}.@${attr.name}`}
                    type={attr.inputType || "text"}
                    value={getValueByPath(formData, `${currentPath}.@${attr.name}`) || ""}
                    onChange={(e) => updateFormData(`${currentPath}.@${attr.name}`, e.target.value)}
                    className={errors[`${currentPath}.@${attr.name}`] ? "border-red-500" : ""}
                  />
                  {errors[`${currentPath}.@${attr.name}`] && (
                    <p className="text-sm text-red-600 mt-1">{errors[`${currentPath}.@${attr.name}`]}</p>
                  )}
                </div>
              ))}

            {/* Render child elements */}
            {element.children?.map((child: any) => {
              if (child.multiple) {
                // This is an array/repeating section - apply collapsible functionality
                const arrayValue = getValueByPath(formData, `${currentPath}.${child.name}`) || []
                const arrayPath = `${currentPath}.${child.name}`
                const childIsCollapsed = isCollapsed[arrayPath] || false

                return (
                  <div key={child.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCollapsed((prev) => ({ ...prev, [arrayPath]: !prev[arrayPath] }))}
                          className="p-1 h-auto"
                        >
                          {childIsCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Label
                          className="text-base font-medium cursor-pointer"
                          onClick={() => setIsCollapsed((prev) => ({ ...prev, [arrayPath]: !prev[arrayPath] }))}
                        >
                          {child.name} {child.required && <span className="text-red-600">*</span>}
                          {arrayValue.length > 0 && (
                            <span className="ml-2 text-sm text-gray-500">({arrayValue.length} items)</span>
                          )}
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        {/* Export button for arrays with data */}
                        {arrayValue.length > 0 && (
                          <ArrayExport data={arrayValue} element={child} arrayName={child.name} />
                        )}
                        {/* Bulk upload button for complex types */}
                        {child.complexType && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBulkUpload(arrayPath)}
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            {t("bulk.title", { name: element.name })}
                          </Button>
                        )}
                      </div>
                    </div>

                    {!childIsCollapsed && (
                      <div className="space-y-2 ml-6 border-l-2 border-gray-100 pl-4">
                        {arrayValue.map((_: any, index: number) => (
                          <div key={index}>{renderFormField(child, arrayPath, index)}</div>
                        ))}
                      </div>
                    )}

                    {errors[arrayPath] && <p className="text-sm text-red-600">{errors[arrayPath]}</p>}
                    
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addArrayItem(arrayPath, child)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t("form.addItem", { item: child.name })}
                        </Button>
                  </div>
                )
              } else {
                // This is a single element - render normally without collapsible functionality
                return renderFormField(child, currentPath)
              }
            })}
          </CardContent>
        </Card>
      )
    } else {
      // Simple element
      const inputType = element.inputType || "text"
      const isTextarea = element.baseType === "string" && !element.restrictions?.pattern && inputType === "text"
      const isStringType = element.baseType === "string" || !element.baseType || inputType === "text"
      const canUseCdata = isStringType // Only string-like fields can use CDATA
      const useCdata = isCdataEnabled(currentPath, element, cdataSettings)

      return (
        <div key={currentPath} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={currentPath} className="flex items-center">
              {element.name} {element.required && <span className="text-red-600">*</span>}
              {useCdata && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">CDATA</span>
              )}
            </Label>

            {/* CDATA toggle switch */}
            {canUseCdata && (
              <div className="flex items-center space-x-2">
                <Label htmlFor={`cdata-${currentPath}`} className="text-xs text-gray-500">
                  {t("form.cdata")}
                </Label>
                <Switch
                  id={`cdata-${currentPath}`}
                  checked={useCdata}
                  onCheckedChange={() => toggleCdata(currentPath)}
                />
              </div>
            )}
          </div>

          {element.restrictions?.pattern && (
            <p className="text-xs text-gray-600">Pattern: {element.restrictions.pattern}</p>
          )}
          {element.placeholder && <p className="text-xs text-gray-600">Format: {element.placeholder}</p>}
          {isTextarea ? (
            <Textarea
              id={currentPath}
              value={value || ""}
              onChange={(e) => updateFormData(currentPath, e.target.value)}
              className={error ? "border-red-500" : useCdata ? "border-blue-200 bg-blue-50" : ""}
              rows={3}
            />
          ) : (
            <Input
              id={currentPath}
              type={inputType}
              value={value || ""}
              onChange={(e) => updateFormData(currentPath, e.target.value)}
              className={error ? "border-red-500" : useCdata ? "border-blue-200 bg-blue-50" : ""}
              step={element.step}
              placeholder={element.placeholder}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )
    }
  }

  const bulkElement: ElementDef | undefined = showBulkUpload
    ? (() => {
        const pathParts = showBulkUpload.split(".")
        let current: ElementDef | undefined = schema
        for (let i = 1; i < pathParts.length; i++) {
          current = current?.children?.find((child) => child.name === pathParts[i])
        }
        return current
      })()
    : undefined

  return (
    <div className="space-y-6" data-form-section>
      <XmlImporter
        schema={schema}
        onDataImported={handleXmlImport}
        onClearForm={handleClearForm}
        hasFormData={hasFormData()}
      />

      <div className="space-y-4">{renderFormField(schema)}</div>

      <Separator />

      <div className="flex justify-end space-x-4">
        <Button onClick={handleSubmit} className="min-w-[150px]">
          <Eye className="h-4 w-4 mr-2" />
          {t("form.generateXml")}
        </Button>
      </div>

      {generalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      {Object.keys(errors).length > 0 && !generalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("form.fixErrors")}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm">{t("form.debugInfo")}</summary>
              <pre className="text-xs mt-1 bg-gray-100 p-2 rounded">{JSON.stringify(errors, null, 2)}</pre>
            </details>
          </AlertDescription>
        </Alert>
      )}

      {/* XML Preview Section */}
      {showPreview && xmlPreview && (
        <Card className="mt-6 border-green-200">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="text-lg flex items-center text-green-800">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              {t("xml.generated")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t("xml.preview")}</h3>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={copyXmlToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("xml.copy")}
                  </Button>
                  <Button size="sm" onClick={downloadXml}>
                    <Download className="h-4 w-4 mr-2" />
                    {t("xml.download")}
                  </Button>
                </div>
              </div>
            </div>
            <pre className="p-4 overflow-auto max-h-[400px] text-sm">{xmlPreview}</pre>
          </CardContent>
        </Card>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && bulkElement && (
        <Dialog open={showBulkUpload !== null} onOpenChange={(open) => !open && setShowBulkUpload(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <DialogTitle className="sr-only">{t("bulk.title", { name: bulkElement.name })}</DialogTitle>
            <BulkUpload
              element={bulkElement}
              onDataImported={(data, cdataColumns) => handleBulkImport(showBulkUpload, data, cdataColumns)}
              onClose={() => setShowBulkUpload(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
