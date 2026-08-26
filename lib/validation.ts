import type { ElementDef } from "./xsd-parser"
import type { Errors, Translate } from "./types"
import { getValueByPath } from "./form-data"
import { compileXsdPattern } from "./xsd-regex"

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)

export function validateField(value: unknown, element: ElementDef, t: Translate): string | null {
  if (element.required && isEmpty(value)) {
    return t("validation.required", { field: element.name })
  }

  if (isEmpty(value) && !element.required) {
    return null
  }

  if (value && element.restrictions) {
    const { pattern, minLength, maxLength, fractionDigits, minInclusive, maxInclusive } = element.restrictions

    if (pattern && typeof value === "string") {
      const regex = compileXsdPattern(pattern)
      if (regex && !regex.test(value)) {
        return t("validation.pattern", { field: element.name, pattern })
      }
    }

    if (minLength && typeof value === "string" && value.length < minLength) {
      return t("validation.minLength", { field: element.name, min: minLength })
    }

    if (maxLength && typeof value === "string" && value.length > maxLength) {
      return t("validation.maxLength", { field: element.name, max: maxLength })
    }

    if (fractionDigits !== undefined && typeof value === "string") {
      const parts = value.split(".")
      if (parts.length > 1 && parts[1].length > fractionDigits) {
        return t("validation.fractionDigits", { field: element.name, digits: fractionDigits })
      }
    }

    if (minInclusive !== undefined && Number(value) < minInclusive) {
      return t("validation.minValue", { field: element.name, min: minInclusive })
    }

    if (maxInclusive !== undefined && Number(value) > maxInclusive) {
      return t("validation.maxValue", { field: element.name, max: maxInclusive })
    }
  }

  if (value && element.baseType) {
    const strValue = String(value)
    switch (element.baseType) {
      case "integer":
      case "int":
      case "long":
      case "short":
        if (!/^-?\d+$/.test(strValue)) {
          return t("validation.integer", { field: element.name })
        }
        break
      case "decimal":
      case "float":
      case "double":
        if (!/^-?\d*\.?\d*$/.test(strValue)) {
          return t("validation.decimal", { field: element.name })
        }
        break
    }
  }

  return null
}

export function validateFormData(
  schema: ElementDef,
  formData: Record<string, unknown>,
  t: Translate
): { errors: Errors; isValid: boolean } {
  const errors: Errors = {}
  let isValid = true

  const validateElementRecursive = (element: ElementDef, dataPath: string, errorPath: string): void => {
    const value = getValueByPath(formData, dataPath)

    if (element.complexType) {
      if (element.attributes) {
        element.attributes.forEach((attr: any) => {
          const attrPath = `${dataPath}.@${attr.name}`
          const attrErrorPath = `${errorPath}.@${attr.name}`
          const attrValue = getValueByPath(formData, attrPath)
          const error = validateField(attrValue, attr, t)
          if (error) {
            errors[attrErrorPath] = error
            isValid = false
          }
        })
      }

      if (element.children) {
        element.children.forEach((child: ElementDef) => {
          const childDataPath = `${dataPath}.${child.name}`
          const childErrorPath = `${errorPath}.${child.name}`

          if (child.multiple) {
            const arrayValue = getValueByPath(formData, childDataPath) || []

            if (child.required && arrayValue.length === 0) {
              errors[childErrorPath] = t("validation.atLeastOne", { field: child.name })
              isValid = false
            }

            arrayValue.forEach((item: any, index: number) => {
              const itemDataPath = `${childDataPath}.${index}`
              const itemErrorPath = `${childErrorPath}.${index}`
              validateElementRecursive(child, itemDataPath, itemErrorPath)
            })
          } else if (child.complexType) {
            validateElementRecursive(child, childDataPath, childErrorPath)
          } else {
            const childValue = getValueByPath(formData, childDataPath)
            const error = validateField(childValue, child, t)
            if (error) {
              errors[childErrorPath] = error
              isValid = false
            }
          }
        })
      }
    } else {
      const error = validateField(value, element, t)
      if (error) {
        errors[errorPath] = error
        isValid = false
      }
    }
  }

  validateElementRecursive(schema, schema.name, schema.name)

  return { errors, isValid }
}
