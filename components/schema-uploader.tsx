"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, CheckCircle, AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

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

  const parseXSDSchema = (xsdContent: string) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xsdContent, "text/xml")

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror")
    if (parseError) {
      throw new Error("Invalid XML/XSD format")
    }

    const schema = xmlDoc.querySelector("schema")
    if (!schema) {
      throw new Error("No schema element found in the XSD file")
    }

    // Find the root element
    const rootElement = schema.querySelector("element")
    if (!rootElement) {
      throw new Error("No root element found in the schema")
    }

    return parseElement(rootElement, schema)
  }

  const getBaseType = (typeString: string): string => {
    if (typeString.includes(":")) {
      return typeString.split(":")[1]
    }
    return typeString
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

    // Handle complex types
    const complexType = element.querySelector("complexType")
    if (complexType) {
      elementDef.complexType = true

      // Parse attributes - only from the direct complexType, not inherited
      const directAttributes = complexType.querySelectorAll(":scope > attribute")
      directAttributes.forEach((attr) => {
        const attrName = attr.getAttribute("name") || ""
        const attrUse = attr.getAttribute("use") || "optional"
        const attrType = attr.getAttribute("type") || "xs:string"

        const attrDef: any = {
          name: attrName,
          type: attrType,
          required: attrUse === "required",
          inputType: "text",
        }

        // Handle attribute restrictions
        const simpleType = attr.querySelector("simpleType")
        if (simpleType) {
          const restriction = simpleType.querySelector("restriction")
          if (restriction) {
            attrDef.restrictions = parseRestrictions(restriction)
          }
        }

        elementDef.attributes.push(attrDef)
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

    // Handle simple types with restrictions
    const simpleType = element.querySelector("simpleType")
    if (simpleType) {
      const restriction = simpleType.querySelector("restriction")
      if (restriction) {
        const baseType = restriction.getAttribute("base") || "xs:string"
        elementDef.baseType = getBaseType(baseType)
        elementDef.restrictions = parseRestrictions(restriction)

        // Check if this is a string with the specific pattern that needs CDATA
        if (
          elementDef.baseType === "string" &&
          elementDef.restrictions.pattern === ".*[^\\s].*" &&
          elementDef.restrictions.minLength === 1
        ) {
          elementDef.useCDATA = true
        }

        // Update input type based on base type and restrictions
        if (elementDef.restrictions.pattern) {
          // Check for date patterns
          const pattern = elementDef.restrictions.pattern
          if (pattern.includes("[0-9]") && pattern.includes("-")) {
            elementDef.inputType = "text" // Keep as text for custom date formats
            elementDef.placeholder = "DD-MM-YYYY"
          }
        }

        // Set input type based on base type
        const baseTypeClean = getBaseType(baseType)
        switch (baseTypeClean) {
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
            elementDef.step = elementDef.restrictions.fractionDigits
              ? `0.${"0".repeat(elementDef.restrictions.fractionDigits - 1)}1`
              : "0.01"
            break
        }
      }
    }

    return elementDef
  }

  const parseRestrictions = (restriction: Element): any => {
    const restrictions: any = {}

    // Parse patterns
    const pattern = restriction.querySelector("pattern")
    if (pattern) {
      restrictions.pattern = pattern.getAttribute("value")
    }

    // Parse min/max length
    const minLength = restriction.querySelector("minLength")
    if (minLength) {
      restrictions.minLength = Number.parseInt(minLength.getAttribute("value") || "0")
    }

    const maxLength = restriction.querySelector("maxLength")
    if (maxLength) {
      restrictions.maxLength = Number.parseInt(maxLength.getAttribute("value") || "0")
    }

    // Parse fraction digits
    const fractionDigits = restriction.querySelector("fractionDigits")
    if (fractionDigits) {
      restrictions.fractionDigits = Number.parseInt(fractionDigits.getAttribute("value") || "0")
    }

    // Parse min/max values
    const minInclusive = restriction.querySelector("minInclusive")
    if (minInclusive) {
      restrictions.minInclusive = Number.parseFloat(minInclusive.getAttribute("value") || "0")
    }

    const maxInclusive = restriction.querySelector("maxInclusive")
    if (maxInclusive) {
      restrictions.maxInclusive = Number.parseFloat(maxInclusive.getAttribute("value") || "0")
    }

    // Parse enumerations
    const enumerations = restriction.querySelectorAll("enumeration")
    if (enumerations.length > 0) {
      restrictions.enumeration = Array.from(enumerations).map((e) => e.getAttribute("value"))
    }

    return restrictions
  }

  const saveSchema = async (filename: string, content: string) => {
    // try {
    //   const formData = new FormData()
    //   const file = new File([content], filename, { type: "application/xml" })
    //   formData.append("file", file)
    //   formData.append("content", content)

    //   const response = await fetch("/api/schemas", {
    //     method: "POST",
    //     body: formData,
    //   })

    //   if (!response.ok) {
    //     console.warn("Failed to save schema:", await response.text())
    //   }
    // } catch (error) {
    //   console.warn("Error saving schema:", error)
    // }
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
