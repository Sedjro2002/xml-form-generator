import { describe, it, expect } from "vitest"
import { escapeXml, isCdataEnabled, generateXml } from "./xml"
import type { ElementDef } from "./xsd-parser"

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

describe("escapeXml", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f")
  })

  it("stringifies non-string values", () => {
    expect(escapeXml(42)).toBe("42")
  })
})

describe("isCdataEnabled", () => {
  it("prefers an explicit override over the schema default", () => {
    const element = el({ useCDATA: false })
    expect(isCdataEnabled("p", element, { p: true })).toBe(true)
  })

  it("falls back to the schema default when no override", () => {
    expect(isCdataEnabled("p", el({ useCDATA: true }), {})).toBe(true)
    expect(isCdataEnabled("p", el({ useCDATA: false }), {})).toBe(false)
  })
})

describe("generateXml", () => {
  it("renders a simple element", () => {
    const xml = generateXml(el({ name: "Name" }), "Alice", {}, 0, "Name")
    expect(xml).toBe("<Name>Alice</Name>\n")
  })

  it("escapes text content", () => {
    const xml = generateXml(el({ name: "Name" }), "<a & b>", {}, 0, "Name")
    expect(xml).toBe("<Name>&lt;a &amp; b&gt;</Name>\n")
  })

  it("wraps text in CDATA when enabled", () => {
    const xml = generateXml(el({ name: "Note", useCDATA: true }), "hello", {}, 0, "Note")
    expect(xml).toBe("<Note><![CDATA[hello]]></Note>\n")
  })

  it("splits ]] inside CDATA so it stays valid", () => {
    const xml = generateXml(el({ name: "Note", useCDATA: true }), "a]]>b", {}, 0, "Note")
    expect(xml).toBe("<Note><![CDATA[a]]]]><![CDATA[>b]]></Note>\n")
  })

  it("renders a complex element with attributes and children", () => {
    const schema = el({
      name: "Person",
      complexType: true,
      attributes: [{ name: "id", type: "xs:string", required: false }],
      children: [el({ name: "Name" }), el({ name: "Age" })],
    })
    const data = { "@id": `a"b`, Name: "Alice", Age: "30" }
    const xml = generateXml(schema, data, {}, 0, "Person")

    expect(xml).toBe(
      '<Person id="a&quot;b">\n' + "  <Name>Alice</Name>\n" + "  <Age>30</Age>\n" + "</Person>\n"
    )
  })

  it("renders repeated (multiple) children", () => {
    const schema = el({
      name: "List",
      complexType: true,
      children: [el({ name: "Item", multiple: true })],
    })
    const xml = generateXml(schema, { Item: ["a", "b"] }, {}, 0, "List")
    expect(xml).toBe("<List>\n  <Item>a</Item>\n  <Item>b</Item>\n</List>\n")
  })

  it("skips empty non-required children", () => {
    const schema = el({ name: "List", complexType: true, children: [el({ name: "Item" })] })
    const xml = generateXml(schema, {}, {}, 0, "List")
    expect(xml).toBe("<List>\n</List>\n")
  })
})
