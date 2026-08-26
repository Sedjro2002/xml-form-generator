export interface ElementDef {
  name: string
  type: string
  baseType?: string
  minOccurs: number
  maxOccurs: number
  required: boolean
  multiple: boolean
  complexType?: boolean
  inputType: string
  step?: string
  placeholder?: string
  useCDATA: boolean
  restrictions?: any
  attributes: any[]
  children: ElementDef[]
}

const parseRestrictions = (restriction: Element): any => {
  const restrictions: any = {}

  const pattern = restriction.querySelector("pattern")
  if (pattern) {
    restrictions.pattern = pattern.getAttribute("value")
  }

  const minLength = restriction.querySelector("minLength")
  if (minLength) {
    restrictions.minLength = Number.parseInt(minLength.getAttribute("value") || "0")
  }

  const maxLength = restriction.querySelector("maxLength")
  if (maxLength) {
    restrictions.maxLength = Number.parseInt(maxLength.getAttribute("value") || "0")
  }

  const fractionDigits = restriction.querySelector("fractionDigits")
  if (fractionDigits) {
    restrictions.fractionDigits = Number.parseInt(fractionDigits.getAttribute("value") || "0")
  }

  const minInclusive = restriction.querySelector("minInclusive")
  if (minInclusive) {
    restrictions.minInclusive = Number.parseFloat(minInclusive.getAttribute("value") || "0")
  }

  const maxInclusive = restriction.querySelector("maxInclusive")
  if (maxInclusive) {
    restrictions.maxInclusive = Number.parseFloat(maxInclusive.getAttribute("value") || "0")
  }

  const enumerations = restriction.querySelectorAll("enumeration")
  if (enumerations.length > 0) {
    restrictions.enumeration = Array.from(enumerations).map((e) => e.getAttribute("value"))
  }

  return restrictions
}

const getBaseType = (typeString: string): string => {
  if (typeString.includes(":")) {
    return typeString.split(":")[1]
  }
  return typeString
}

const setInputTypeForBaseType = (elementDef: any, baseType: string) => {
  elementDef.baseType = baseType

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

const parseElement = (element: Element, schema: Element): ElementDef => {
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
    inputType: "text",
    useCDATA: false,
    attributes: [],
    children: [],
  }

  if (type) {
    setInputTypeForBaseType(elementDef, getBaseType(type))
  }

  const complexType = element.querySelector("complexType")
  if (complexType) {
    elementDef.complexType = true

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

      const simpleType = attr.querySelector("simpleType")
      if (simpleType) {
        const restriction = simpleType.querySelector("restriction")
        if (restriction) {
          attrDef.restrictions = parseRestrictions(restriction)
        }
      }

      elementDef.attributes.push(attrDef)
    })

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
      elementDef.restrictions = parseRestrictions(restriction)

      if (
        elementDef.baseType === "string" &&
        elementDef.restrictions.pattern === ".*[^\\s].*" &&
        elementDef.restrictions.minLength === 1
      ) {
        elementDef.useCDATA = true
      }

      if (elementDef.restrictions.pattern) {
        const pattern = elementDef.restrictions.pattern
        if (pattern.includes("[0-9]") && pattern.includes("-")) {
          elementDef.inputType = "text"
          elementDef.placeholder = "DD-MM-YYYY"
        }
      }

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

export const parseXSDSchema = (xsdContent: string): ElementDef => {
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
