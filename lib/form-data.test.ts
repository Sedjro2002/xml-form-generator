import { describe, it, expect } from "vitest"
import { getValueByPath, setValueByPath } from "./form-data"

describe("getValueByPath", () => {
  const data = {
    Root: {
      Child: { Name: "Alice" },
      Items: [{ Field: "a" }, { Field: "b" }],
      "@attr": "value",
    },
  }

  it("reads nested values", () => {
    expect(getValueByPath(data, "Root.Child.Name")).toBe("Alice")
  })

  it("reads array items by numeric index", () => {
    expect(getValueByPath(data, "Root.Items.1.Field")).toBe("b")
  })

  it("reads attribute values", () => {
    expect(getValueByPath(data, "Root.@attr")).toBe("value")
  })

  it("returns undefined for missing paths", () => {
    expect(getValueByPath(data, "Root.Missing.Field")).toBeUndefined()
  })
})

describe("setValueByPath", () => {
  it("sets a nested value without mutating the original", () => {
    const original = { Root: { Child: { Name: "Alice" } } }
    const next = setValueByPath(original, "Root.Child.Name", "Bob")

    expect(next).toEqual({ Root: { Child: { Name: "Bob" } } })
    expect(original.Root.Child.Name).toBe("Alice")
  })

  it("creates missing intermediate objects", () => {
    const next = setValueByPath({}, "Root.Child.Name", "Bob")
    expect(next).toEqual({ Root: { Child: { Name: "Bob" } } })
  })

  it("creates arrays for numeric segments", () => {
    const next = setValueByPath({}, "Root.Items.0.Field", "x")
    expect(next).toEqual({ Root: { Items: [{ Field: "x" }] } })
  })

  it("updates an existing array item in place of the path", () => {
    const original = { Root: { Items: [{ Field: "a" }, { Field: "b" }] } }
    const next = setValueByPath(original, "Root.Items.1.Field", "z")

    expect(next.Root.Items).toEqual([{ Field: "a" }, { Field: "z" }])
    expect(original.Root.Items[1].Field).toBe("b")
  })

  it("sets an array value at a leaf path", () => {
    const next = setValueByPath({}, "Root.Items", [{ Field: "a" }])
    expect(next).toEqual({ Root: { Items: [{ Field: "a" }] } })
  })
})
