"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileSpreadsheet, AlertCircle, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/contexts/language-context"

interface BulkUploadProps {
  element: any
  onDataImported: (data: any[], cdataColumns: string[]) => void
  onClose: () => void
}

export function BulkUpload({ element, onDataImported, onClose }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>("")
  const [preview, setPreview] = useState<any[] | null>(null)
  const [cdataColumns, setCdataColumns] = useState<Set<string>>(new Set())
  const [showCdataConfig, setShowCdataConfig] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  // Extract expected column names from the element structure
  const getExpectedColumns = (elem: any, prefix = ""): string[] => {
    const columns: string[] = []

    if (elem.complexType) {
      // Add attributes
      if (elem.attributes) {
        elem.attributes.forEach((attr: any) => {
          columns.push(prefix ? `${prefix}.@${attr.name}` : `@${attr.name}`)
        })
      }

      // Add child elements (non-multiple only for simplicity)
      if (elem.children) {
        elem.children.forEach((child: any) => {
          if (!child.multiple) {
            if (child.complexType) {
              columns.push(...getExpectedColumns(child, prefix ? `${prefix}.${child.name}` : child.name))
            } else {
              columns.push(prefix ? `${prefix}.${child.name}` : child.name)
            }
          }
        })
      }
    } else {
      columns.push(prefix || elem.name)
    }

    return columns
  }

  // Get columns that can use CDATA (string-like fields only) - pure function without side effects
  const getCdataEligibleColumns = (elem: any, prefix = ""): { columns: string[]; defaultCdataColumns: string[] } => {
    const columns: string[] = []
    const defaultCdataColumns: string[] = []

    if (elem.complexType) {
      // Add child elements that are string-like
      if (elem.children) {
        elem.children.forEach((child: any) => {
          if (!child.multiple) {
            if (child.complexType) {
              const childResult = getCdataEligibleColumns(child, prefix ? `${prefix}.${child.name}` : child.name)
              columns.push(...childResult.columns)
              defaultCdataColumns.push(...childResult.defaultCdataColumns)
            } else {
              // Check if it's a string-like field
              const isStringType =
                child.baseType === "string" ||
                !child.baseType ||
                child.inputType === "text" ||
                child.inputType === "textarea"

              if (isStringType) {
                const columnName = prefix ? `${prefix}.${child.name}` : child.name
                columns.push(columnName)

                // Track fields that should have CDATA enabled by default
                if (child.useCDATA) {
                  defaultCdataColumns.push(columnName)
                }
              }
            }
          }
        })
      }
    } else {
      // Simple element - check if it's string-like
      const isStringType =
        elem.baseType === "string" || !elem.baseType || elem.inputType === "text" || elem.inputType === "textarea"

      if (isStringType) {
        const columnName = prefix || elem.name
        columns.push(columnName)

        if (elem.useCDATA) {
          defaultCdataColumns.push(columnName)
        }
      }
    }

    return { columns, defaultCdataColumns }
  }

  // Memoize the expected columns and CDATA eligible columns
  const expectedColumns = useMemo(() => getExpectedColumns(element), [element])
  const cdataEligibleData = useMemo(() => getCdataEligibleColumns(element), [element])
  const cdataEligibleColumns = cdataEligibleData.columns

  // Initialize CDATA columns when element changes
  useEffect(() => {
    const { defaultCdataColumns } = getCdataEligibleColumns(element)
    setCdataColumns(new Set(defaultCdataColumns))
  }, [element])

  const toggleCdataColumn = (column: string) => {
    setCdataColumns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(column)) {
        newSet.delete(column)
      } else {
        newSet.add(column)
      }
      return newSet
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      const fileExtension = selectedFile.name.toLowerCase()
      if (fileExtension.endsWith(".csv") || fileExtension.endsWith(".xlsx") || fileExtension.endsWith(".xls")) {
        setFile(selectedFile)
        setError("")
        processFile(selectedFile)
        setActiveTab("preview") // Auto-switch to preview tab
      } else {
        setError(t("bulk.invalidFileFormat"))
        setFile(null)
      }
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setError("")

    try {
      const data = await readFile(file)
      if (data.length === 0) {
        throw new Error(t("bulk.emptyFile"))
      }

      // Validate columns
      const fileColumns = Object.keys(data[0])
      const missingColumns = expectedColumns.filter((col) => !fileColumns.includes(col))
      const extraColumns = fileColumns.filter((col) => !expectedColumns.includes(col))

      if (missingColumns.length > 0) {
        console.warn("Missing columns:", missingColumns)
      }

      if (extraColumns.length > 0) {
        console.warn("Extra columns (will be ignored):", extraColumns)
      }

      setPreview(data.slice(0, 3)) // Show only first 3 rows to save space
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bulk.fileProcessingError"))
    } finally {
      setIsProcessing(false)
    }
  }

  const readFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target?.result

          if (file.name.toLowerCase().endsWith(".csv")) {
            // Parse CSV
            const text = data as string
            const lines = text.split("\n").filter((line) => line.trim())
            if (lines.length < 2) {
              throw new Error(t("bulk.invalidCsvFormat"))
            }

            const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
            const rows = lines.slice(1).map((line) => {
              const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
              const row: any = {}
              headers.forEach((header, index) => {
                row[header] = values[index] || ""
              })
              return row
            })

            resolve(rows)
          } else {
            // Parse Excel using dynamic import
            const XLSX = await import("xlsx")
            const workbook = XLSX.read(data, { type: "array" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet)

            if (jsonData.length === 0) {
              throw new Error(t("bulk.emptyExcelFile"))
            }

            resolve(jsonData)
          }
        } catch (err) {
          reject(err)
        }
      }

      reader.onerror = () => reject(new Error(t("bulk.fileReadError")))

      if (file.name.toLowerCase().endsWith(".csv")) {
        reader.readAsText(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    })
  }

  const convertToFormData = (rawData: any[]): any[] => {
    return rawData.map((row) => {
      const formItem: any = {}

      expectedColumns.forEach((col) => {
        const value = row[col]
        if (value !== undefined && value !== "") {
          setNestedValue(formItem, col, value)
        }
      })

      return formItem
    })
  }

  const setNestedValue = (obj: any, path: string, value: any) => {
    const parts = path.split(".")
    let current = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    const lastPart = parts[parts.length - 1]
    current[lastPart] = value
  }

  const handleImport = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const rawData = await readFile(file)
      const formData = convertToFormData(rawData)
      onDataImported(formData, Array.from(cdataColumns))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bulk.importError"))
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      // Create CSV template with additional info about CDATA columns
      let csvContent = expectedColumns.join(",") + "\n"
      csvContent += expectedColumns.map(() => "").join(",") + "\n"

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${element.name}_template.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(t("bulk.templateDownloadError"))
    }
  }

  return (
    <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5" />
          {t("bulk.title", { name: element.name })}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="upload">{t("bulk.upload")}</TabsTrigger>
            <TabsTrigger value="preview" disabled={!preview}>
              {t("bulk.preview")}
            </TabsTrigger>
            <TabsTrigger value="config" disabled={cdataEligibleColumns.length === 0}>
              CDATA ({cdataColumns.size})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="upload" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">
                    {t("bulk.expectedColumns", { count: expectedColumns.length })}
                  </Label>
                  <div className="mt-2 max-h-24 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {expectedColumns.map((col) => (
                        <span key={col} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {t("bulk.downloadTemplate")}
                  </Button>

                  <div>
                    <Label htmlFor="bulk-file" className="text-sm font-medium">
                      {t("bulk.uploadFile")}
                    </Label>
                    <Input
                      id="bulk-file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      className="mt-2 cursor-pointer"
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t("bulk.supportsFiles")}</p>
                  </div>

                  {file && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">{file.name}</span>
                          <span className="text-xs text-blue-600">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-0">
              {preview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t("bulk.dataPreview", { count: 3 })}</Label>
                    <span className="text-xs text-gray-500">{t("bulk.rowsShown", { count: preview.length })}</span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(preview[0]).map((col) => (
                              <th key={col} className="border-b border-gray-200 px-3 py-2 text-left font-medium">
                                <div className="flex items-center gap-1">
                                  <span className="truncate max-w-20" title={col}>
                                    {col}
                                  </span>
                                  {cdataColumns.has(col) && (
                                    <span className="text-xs bg-blue-600 text-white px-1 rounded">CDATA</span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {Object.values(row).map((value: any, colIndex) => {
                                const columnName = Object.keys(preview[0])[colIndex]
                                const isCdataColumn = cdataColumns.has(columnName)
                                return (
                                  <td
                                    key={colIndex}
                                    className={`border-b border-gray-100 px-3 py-2 ${
                                      isCdataColumn ? "bg-blue-50" : ""
                                    }`}
                                  >
                                    <div className="truncate max-w-32" title={String(value)}>
                                      {String(value)}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-4 mt-0">
              {cdataEligibleColumns.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-base font-medium">{t("bulk.cdataConfig")}</Label>
                    <p className="text-sm text-gray-600 mt-1">{t("bulk.cdataDescription")}</p>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {cdataEligibleColumns.map((col) => (
                        <div key={col} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <Label htmlFor={`cdata-${col}`} className="text-sm font-medium cursor-pointer truncate">
                              {col}
                            </Label>
                            {cdataColumns.has(col) && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex-shrink-0">
                                CDATA
                              </span>
                            )}
                          </div>
                          <Switch
                            id={`cdata-${col}`}
                            checked={cdataColumns.has(col)}
                            onCheckedChange={() => toggleCdataColumn(col)}
                            className="flex-shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <div className="p-6 pt-4 border-t flex justify-end space-x-2 flex-shrink-0">
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleImport} disabled={!preview || isProcessing} className="min-w-[120px]">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              {t("bulk.processing")}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {t("bulk.import")}
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
