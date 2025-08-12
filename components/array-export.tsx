"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface ArrayExportProps {
  data: any[]
  element: any
  arrayName: string
}

export function ArrayExport({ data, element, arrayName }: ArrayExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { t } = useLanguage()

  // Extract column headers from the element structure
  const getColumnHeaders = (elem: any, prefix = ""): string[] => {
    const headers: string[] = []

    if (elem.complexType) {
      // Add attributes
      if (elem.attributes) {
        elem.attributes.forEach((attr: any) => {
          headers.push(prefix ? `${prefix}.@${attr.name}` : `@${attr.name}`)
        })
      }

      // Add child elements (non-multiple only for export)
      if (elem.children) {
        elem.children.forEach((child: any) => {
          if (!child.multiple) {
            if (child.complexType) {
              headers.push(...getColumnHeaders(child, prefix ? `${prefix}.${child.name}` : child.name))
            } else {
              headers.push(prefix ? `${prefix}.${child.name}` : child.name)
            }
          }
        })
      }
    } else {
      headers.push(prefix || elem.name)
    }

    return headers
  }

  // Flatten nested object data for export
  const flattenData = (obj: any, prefix = ""): Record<string, any> => {
    const flattened: Record<string, any> = {}

    Object.keys(obj).forEach((key) => {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key

      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenData(value, newKey))
      } else if (!Array.isArray(value)) {
        // Only include non-array values (arrays would be nested repeated elements)
        flattened[newKey] = value || ""
      }
    })

    return flattened
  }

  // Convert array data to exportable format
  const prepareExportData = (): any[] => {
    if (!data || data.length === 0) return []

    return data.map((item, index) => {
      const flattened = flattenData(item)
      return {
        "#": index + 1, // Add row number
        ...flattened,
      }
    })
  }

  // Export as CSV
  const exportAsCSV = async () => {
    if (!data || data.length === 0) {
      alert(t("export.noData"))
      return
    }

    setIsExporting(true)

    try {
      const exportData = prepareExportData()
      const headers = Object.keys(exportData[0])

      // Create CSV content
      let csvContent = headers.join(",") + "\n"

      exportData.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header]
          // Escape commas and quotes in CSV
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value || ""
        })
        csvContent += values.join(",") + "\n"
      })

      // Download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${arrayName.toLowerCase().replace(/\s+/g, "_")}_export.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    //   alert(t("export.success"))
    } catch (error) {
      console.error("CSV export error:", error)
      alert(t("export.error"))
    } finally {
      setIsExporting(false)
    }
  }

  // Export as Excel
  const exportAsExcel = async () => {
    if (!data || data.length === 0) {
      alert(t("export.noData"))
      return
    }

    setIsExporting(true)

    try {
      // Dynamic import of XLSX library
      const XLSX = await import("xlsx")

      const exportData = prepareExportData()

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Auto-size columns
      const columnWidths = Object.keys(exportData[0]).map((key) => {
        const maxLength = Math.max(key.length, ...exportData.map((row) => String(row[key] || "").length))
        return { wch: Math.min(maxLength + 2, 50) } // Max width of 50 characters
      })
      worksheet["!cols"] = columnWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, arrayName)

      // Generate Excel file and download
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${arrayName.toLowerCase().replace(/\s+/g, "_")}_export.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    //   alert(t("export.success"))
    } catch (error) {
      console.error("Excel export error:", error)
      alert(t("export.error"))
    } finally {
      setIsExporting(false)
    }
  }

  // Don't show export button if no data
  if (!data || data.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
              {t("export.generating")}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {t("export.title")}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsCSV} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          {t("export.csv")} ({data.length} rows)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsExcel} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t("export.excel")} ({data.length} rows)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
