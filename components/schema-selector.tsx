"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, HardDrive, AlertCircle, Trash2, MoreVertical, Pencil } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/contexts/language-context"

interface Schema {
  filename: string
  name: string
  size: number
  uploadDate: string
}

interface SchemaSelectorProps {
  onSchemaSelected: (schema: any, name: string) => void
}

export function SchemaSelector({ onSchemaSelected }: SchemaSelectorProps) {
  const [savedSchemas, setSavedSchemas] = useState<Schema[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [loadingSchema, setLoadingSchema] = useState<string>("")
  const [deletingSchema, setDeletingSchema] = useState<string>("")
  const [renamingSchema, setRenamingSchema] = useState<string>("")
  const [schemaToDelete, setSchemaToDelete] = useState<Schema | null>(null)
  const [schemaToRename, setSchemaToRename] = useState<Schema | null>(null)
  const [newSchemaName, setNewSchemaName] = useState<string>("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    loadSavedSchemas()
  }, [])

  const loadSavedSchemas = async () => {
    try {
      // Get all keys from localStorage that start with "schema:"
      const schemas: Schema[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("schema:")) {
          const content = localStorage.getItem(key) || ""
          // Try to extract name and size from the key/content
          const name = key.replace(/^schema:/, "").replace(/\.(xsd|xml)$/, "")
          const size = content.length
          const uploadDate = "" // If you want to store uploadDate, save it when uploading
          schemas.push({
            filename: key,
            name,
            size,
            uploadDate,
          })
        }
      }
      setSavedSchemas(schemas)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schemas")
    } finally {
      setIsLoading(false)
    }
  }

  const parseXSDSchema = (xsdContent: string) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xsdContent, "text/xml")

    const parseError = xmlDoc.querySelector("parsererror")
    if (parseError) {
      throw new Error("Invalid XML/XSD format")
    }

    const schema = xmlDoc.querySelector("schema")
    if (!schema) {
      throw new Error("No schema element found in the XSD file")
    }

    const rootElement = schema.querySelector("element")
    if (!rootElement) {
      throw new Error("No root element found in the schema")
    }

    return parseElement(rootElement, schema)
  }

  // In the parseElement function, add a flag for elements that need CDATA
  const parseElement = (element: Element, schema: Element): any => {
    const name = element.getAttribute("name") || ""
    const type = element.getAttribute("type") || ""
    const minOccurs = element.getAttribute("minOccurs") || "1"
    const maxOccurs = element.getAttribute("maxOccurs") || "1"

    const elementDef: any = {
      name,
      type,
      minOccurs: Number.parseInt(minOccurs),
      maxOccurs: maxOccurs === "unbounded" ? -1 : Number.parseInt(maxOccurs),
      required: minOccurs !== "0",
      multiple: maxOccurs === "unbounded" || Number.parseInt(maxOccurs) > 1,
      inputType: "text", // default
      useCDATA: false, // Default to false
      attributes: [], // Initialize empty attributes array
      children: [], // Initialize empty children array
    }

    // Handle built-in types first
    if (type) {
      const baseType = getBaseType(type)
      elementDef.baseType = baseType

      // Set appropriate input types
      switch (baseType) {
        case "integer":
        case "int":
        case "long":
        case "short":
          elementDef.inputType = "number"
          elementDef.step = "1"
          break
        case "decimal":
        case "float":
        case "double":
          elementDef.inputType = "number"
          elementDef.step = "0.01"
          break
        case "date":
          elementDef.inputType = "date"
          break
        case "dateTime":
          elementDef.inputType = "datetime-local"
          break
        case "boolean":
          elementDef.inputType = "checkbox"
          break
        default:
          elementDef.inputType = "text"
      }
    }

    const complexType = element.querySelector("complexType")
    if (complexType) {
      elementDef.complexType = true

      // Parse attributes - only from the direct complexType, not inherited
      const directAttributes = complexType.querySelectorAll(":scope > attribute")
      directAttributes.forEach((attr) => {
        const attrName = attr.getAttribute("name") || ""
        const attrUse = attr.getAttribute("use") || "optional"
        const attrType = attr.getAttribute("type") || "xs:string"

        elementDef.attributes.push({
          name: attrName,
          type: attrType,
          required: attrUse === "required",
        })
      })

      // Parse sequence elements - only direct children
      const sequence = complexType.querySelector("sequence")
      if (sequence) {
        const childElements = sequence.querySelectorAll(":scope > element")
        childElements.forEach((child) => {
          elementDef.children.push(parseElement(child, schema))
        })
      }
    }

    const simpleType = element.querySelector("simpleType")
    if (simpleType) {
      const restriction = simpleType.querySelector("restriction")
      if (restriction) {
        const baseType = restriction.getAttribute("base") || "xs:string"
        elementDef.baseType = getBaseType(baseType)
        elementDef.restrictions = {}

        // Parse patterns
        const pattern = restriction.querySelector("pattern")
        if (pattern) {
          elementDef.restrictions.pattern = pattern.getAttribute("value")
        }

        // Parse min/max length
        const minLength = restriction.querySelector("minLength")
        if (minLength) {
          elementDef.restrictions.minLength = Number.parseInt(minLength.getAttribute("value") || "0")
        }

        const maxLength = restriction.querySelector("maxLength")
        if (maxLength) {
          elementDef.restrictions.maxLength = Number.parseInt(maxLength.getAttribute("value") || "0")
        }

        // Parse fraction digits
        const fractionDigits = restriction.querySelector("fractionDigits")
        if (fractionDigits) {
          elementDef.restrictions.fractionDigits = Number.parseInt(fractionDigits.getAttribute("value") || "0")
        }

        // Check if this is a string with the specific pattern that needs CDATA
        if (
          elementDef.baseType === "string" &&
          elementDef.restrictions.pattern === ".*[^\\s].*" &&
          elementDef.restrictions.minLength === 1
        ) {
          elementDef.useCDATA = true
        }
      }
    }

    return elementDef
  }

  // Add a helper function to get the base type
  const getBaseType = (typeString: string): string => {
    if (typeString.includes(":")) {
      return typeString.split(":")[1]
    }
    return typeString
  }

  const handleSchemaSelect = async (schema: Schema) => {
    setLoadingSchema(schema.filename)
    setError("")

    try {
      const response = await fetch(`/api/schemas/${schema.filename}`)
      if (!response.ok) {
        throw new Error("Failed to load schema content")
      }

      const data = await response.json()
      const parsedSchema = parseXSDSchema(data.content)

      onSchemaSelected(parsedSchema, schema.name)

      // Scroll to form section
      setTimeout(() => {
        const formSection = document.querySelector("[data-form-section]")
        if (formSection) {
          formSection.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema")
    } finally {
      setLoadingSchema("")
    }
  }

  const handleDeleteSchema = async (schema: Schema) => {
    setDeletingSchema(schema.filename)
    setError("")

    try {
      const response = await fetch(`/api/schemas/${schema.filename}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete schema")
      }

      // Remove the schema from the list
      setSavedSchemas((prev) => prev.filter((s) => s.filename !== schema.filename))
      setShowDeleteDialog(false)
      setSchemaToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schema")
    } finally {
      setDeletingSchema("")
    }
  }

  const handleRenameSchema = async () => {
    if (!schemaToRename || !newSchemaName.trim()) return

    setRenamingSchema(schemaToRename.filename)
    setError("")

    try {
      const response = await fetch("/api/schemas/rename", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldFilename: schemaToRename.filename,
          newFilename: newSchemaName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t("schemas.renameExists"))
        } else {
          throw new Error(data.error || t("schemas.renameError"))
        }
      }

      // Update the schema in the list
      setSavedSchemas((prev) =>
        prev.map((s) =>
          s.filename === schemaToRename.filename
            ? {
              ...s,
              filename: data.newFilename,
              name: data.newFilename.replace(/\.(xsd|xml)$/, ""),
            }
            : s,
        ),
      )

      setShowRenameDialog(false)
      setSchemaToRename(null)
      setNewSchemaName("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("schemas.renameError"))
    } finally {
      setRenamingSchema("")
    }
  }

  const confirmDelete = (schema: Schema) => {
    setSchemaToDelete(schema)
    setShowDeleteDialog(true)
  }

  const openRenameDialog = (schema: Schema) => {
    setSchemaToRename(schema)
    setNewSchemaName(schema.name) // Pre-fill with current name
    setShowRenameDialog(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t("common.bytes")}`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t("common.kilobytes")}`
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("common.megabytes")}`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t("schemas.saved")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-2 text-gray-600">{t("schemas.loadingSchemas")}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t("schemas.saved")}
            <Badge variant="secondary">{savedSchemas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {savedSchemas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t("schemas.noSaved")}</p>
              <p className="text-sm">{t("schemas.uploadToStart")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSchemas.map((schema) => (
                <div key={schema.filename} className="relative group">
                  <Button
                    variant="outline"
                    onClick={() => handleSchemaSelect(schema)}
                    disabled={
                      loadingSchema === schema.filename ||
                      deletingSchema === schema.filename ||
                      renamingSchema === schema.filename
                    }
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-blue-50 w-full"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="font-medium text-left truncate pr-2">{schema.name}</div>
                      {loadingSchema === schema.filename && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(schema.size)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{t("schemas.recentlySaved")}</span>
                      </div>
                    </div>
                  </Button>

                  {/* Actions dropdown */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          disabled={
                            deletingSchema === schema.filename ||
                            renamingSchema === schema.filename ||
                            loadingSchema === schema.filename
                          }
                        >
                          {deletingSchema === schema.filename || renamingSchema === schema.filename ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRenameDialog(schema)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("schemas.renameSchema")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => confirmDelete(schema)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("schemas.deleteSchema")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schemas.deleteSchema")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("schemas.deleteConfirm", { name: schemaToDelete?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => schemaToDelete && handleDeleteSchema(schemaToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("schemas.renameTitle")}</DialogTitle>
            <DialogDescription>{t("schemas.renameDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-schema-name">{t("schemas.newName")}</Label>
            <Input
              id="new-schema-name"
              value={newSchemaName}
              onChange={(e) => setNewSchemaName(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRenameSchema}
              disabled={!newSchemaName.trim() || renamingSchema !== ""}
              className="min-w-[100px]"
            >
              {renamingSchema !== "" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t("common.loading")}
                </>
              ) : (
                t("schemas.rename")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
