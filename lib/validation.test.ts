import { describe, it, expect } from "vitest"
import { validateField, validateFormData } from "./validation"
import type { ElementDef } from "./xsd-parser"
import type { Translate } from "./types"

const el = (overrides: Partial<ElementDef> = {}): ElementDef => ({
  name: "x",
  type: "",
  minOccurs: 1,
  maxOccurs: 1,
  required: false,
  multiple: false,
  inputType: "text",
  useCDATA: false,
  attributes: [],
  children: [],
  ...overrides,
})

// A translator that returns the key so tests assert on the logic, not the wording.
const keyT: Translate = (key) => key

describe("validateField", () => {
  it("reports required fields", () => {
    expect(validateField(undefined, el({ name: "Age", required: true }), keyT)).toBe("validation.required")
    expect(validateField("", el({ name: "Age", required: true }), keyT)).toBe("validation.required")
  })

  it("passes empty optional fields", () => {
    expect(validateField("", el({ name: "Age" }), keyT)).toBeNull()
  })

  it("validates pattern restrictions", () => {
    const field = el({
      name: "Code",
      restrictions: { pattern: "^[A-Z]{3}$" },
      baseType: "string",
    })
    expect(validateField("ABC", field, keyT)).toBeNull()
    expect(validateField("ab1", field, keyT)).toBe("validation.pattern")
  })

  it("ignores invalid regex patterns instead of throwing", () => {
    const field = el({ name: "Code", restrictions: { pattern: "(" } })
    expect(() => validateField("anything", field, keyT)).not.toThrow()
  })

  it("validates minLength and maxLength", () => {
    const field = el({
      name: "Code",
      restrictions: { minLength: 2, maxLength: 4 },
      baseType: "string",
    })
    expect(validateField("a", field, keyT)).toBe("validation.minLength")
    expect(validateField("abcde", field, keyT)).toBe("validation.maxLength")
    expect(validateField("ab", field, keyT)).toBeNull()
  })

  it("validates integer base type", () => {
    expect(validateField("12", el({ name: "N", baseType: "integer" }), keyT)).toBeNull()
    expect(validateField("1.5", el({ name: "N", baseType: "integer" }), keyT)).toBe("validation.integer")
  })

  it("validates decimal base type", () => {
    expect(validateField("1.5", el({ name: "N", baseType: "decimal" }), keyT)).toBeNull()
    expect(validateField("abc", el({ name: "N", baseType: "decimal" }), keyT)).toBe("validation.decimal")
  })

  it("validates minInclusive and maxInclusive", () => {
    const field = el({ name: "N", restrictions: { minInclusive: 1, maxInclusive: 10 }, baseType: "decimal" })
    expect(validateField("0", field, keyT)).toBe("validation.minValue")
    expect(validateField("11", field, keyT)).toBe("validation.maxValue")
    expect(validateField("5", field, keyT)).toBeNull()
  })
})

describe("validateFormData", () => {
  const schema = el({
    name: "Person",
    complexType: true,
    children: [
      el({ name: "Name", required: true, baseType: "string" }),
      el({ name: "Age", baseType: "integer" }),
    ],
  })

  it("returns no errors for valid data", () => {
    const { errors, isValid } = validateFormData(schema, { Person: { Name: "Alice", Age: "30" } }, keyT)
    expect(isValid).toBe(true)
    expect(errors).toEqual({})
  })

  it("collects errors keyed by path", () => {
    const { errors, isValid } = validateFormData(schema, { Person: { Age: "not-a-number" } }, keyT)
    expect(isValid).toBe(false)
    expect(errors["Person.Name"]).toBe("validation.required")
    expect(errors["Person.Age"]).toBe("validation.integer")
  })

  it("requires at least one item for required multiple children", () => {
    const listSchema = el({
      name: "List",
      complexType: true,
      children: [el({ name: "Item", multiple: true, required: true })],
    })
    const { errors, isValid } = validateFormData(listSchema, { List: {} }, keyT)
    expect(isValid).toBe(false)
    expect(errors["List.Item"]).toBe("validation.atLeastOne")
  })
})
