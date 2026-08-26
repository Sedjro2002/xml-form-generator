import type { ElementDef } from "./xsd-parser"
import type { CdataSettings } from "./types"

export function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function isCdataEnabled(path: string, element: ElementDef, cdataSettings: CdataSettings): boolean {
  if (cdataSettings[path] !== undefined) {
    return cdataSettings[path]
  }
  return !!element.useCDATA
}

function wrapCdata(value: unknown): string {
  return `<![CDATA[${String(value).replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`
}

export function generateXml(
  element: ElementDef,
  data: any,
  cdataSettings: CdataSettings = {},
  depth = 0,
  path = ""
): string {
  const indent = "  ".repeat(depth)
  const currentPath = path ? path : element.name

  if (element.complexType) {
    let xml = `${indent}<${element.name}`

    if (element.attributes) {
      element.attributes.forEach((attr: any) => {
        const attrValue = data?.[`@${attr.name}`]
        if (attrValue !== undefined && attrValue !== "") {
          xml += ` ${attr.name}="${escapeXml(attrValue)}"`
        }
      })
    }

    xml += ">\n"

    if (element.children) {
      element.children.forEach((child: ElementDef) => {
        const childPath = `${currentPath}.${child.name}`

        if (child.multiple) {
          const arrayValue = data?.[child.name] || []
          arrayValue.forEach((item: any, index: number) => {
            xml += generateXml(child, item, cdataSettings, depth + 1, `${childPath}.${index}`)
          })
        } else {
          const childValue = data?.[child.name]
          if (childValue !== undefined && childValue !== "") {
            if (child.complexType) {
              xml += generateXml(child, childValue, cdataSettings, depth + 1, childPath)
            } else if (isCdataEnabled(childPath, child, cdataSettings)) {
              xml += `${indent}  <${child.name}>${wrapCdata(childValue)}</${child.name}>\n`
            } else {
              xml += `${indent}  <${child.name}>${escapeXml(childValue)}</${child.name}>\n`
            }
          }
        }
      })
    }

    xml += `${indent}</${element.name}>\n`
    return xml
  }

  const textValue = data || ""
  if (isCdataEnabled(currentPath, element, cdataSettings)) {
    return `${indent}<${element.name}>${wrapCdata(textValue)}</${element.name}>\n`
  }
  return `${indent}<${element.name}>${escapeXml(textValue)}</${element.name}>\n`
}
