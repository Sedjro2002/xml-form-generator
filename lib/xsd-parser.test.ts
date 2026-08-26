import { describe, it, expect } from "vitest"
import { parseXSDSchema } from "./xsd-parser"

const xsd = String.raw`
<schema>
  <element name="Report">
    <complexType>
      <attribute name="version" type="string" use="required"/>
      <sequence>
        <element name="Title" type="string"/>
        <element name="Count" type="xs:integer"/>
        <element name="Amount" type="decimal"/>
        <element name="StartDate" type="date"/>
        <element name="Active" type="boolean"/>
        <element name="Comment">
          <simpleType>
            <restriction base="string">
              <pattern value=".*[^\s].*"/>
              <minLength value="1"/>
            </restriction>
          </simpleType>
        </element>
        <element name="Status">
          <simpleType>
            <restriction base="string">
              <enumeration value="open"/>
              <enumeration value="closed"/>
            </restriction>
          </simpleType>
        </element>
        <element name="Row" maxOccurs="unbounded">
          <complexType>
            <sequence>
              <element name="Value" type="decimal"/>
            </sequence>
          </complexType>
        </element>
        <element name="Optional" type="string" minOccurs="0"/>
      </sequence>
    </complexType>
  </element>
</schema>
`

describe("parseXSDSchema", () => {
  const root = parseXSDSchema(xsd)

  it("parses the root element name", () => {
    expect(root.name).toBe("Report")
    expect(root.complexType).toBe(true)
  })

  it("parses attributes with required flag", () => {
    expect(root.attributes).toEqual([
      expect.objectContaining({ name: "version", required: true }),
    ])
  })

  it("parses child elements", () => {
    const names = root.children.map((c) => c.name)
    expect(names).toContain("Title")
    expect(names).toContain("Count")
    expect(names).toContain("Row")
  })

  it("strips namespace prefix from base types", () => {
    const count = root.children.find((c) => c.name === "Count")!
    expect(count.baseType).toBe("integer")
    expect(count.inputType).toBe("number")
    expect(count.step).toBe("1")
  })

  it("maps decimal and date and boolean input types", () => {
    const amount = root.children.find((c) => c.name === "Amount")!
    expect(amount.inputType).toBe("number")
    expect(amount.step).toBe("0.01")

    const date = root.children.find((c) => c.name === "StartDate")!
    expect(date.inputType).toBe("date")

    const active = root.children.find((c) => c.name === "Active")!
    expect(active.inputType).toBe("checkbox")
  })

  it("applies the CDATA heuristic for free-text patterns", () => {
    const comment = root.children.find((c) => c.name === "Comment")!
    expect(comment.useCDATA).toBe(true)
  })

  it("parses enumeration restrictions", () => {
    const status = root.children.find((c) => c.name === "Status")!
    expect(status.restrictions.enumeration).toEqual(["open", "closed"])
  })

  it("flags unbounded elements as multiple", () => {
    const row = root.children.find((c) => c.name === "Row")!
    expect(row.multiple).toBe(true)
    expect(row.complexType).toBe(true)
    expect(row.children[0].name).toBe("Value")
  })

  it("marks minOccurs=0 elements as not required", () => {
    const optional = root.children.find((c) => c.name === "Optional")!
    expect(optional.required).toBe(false)
  })

  it("throws on invalid XML", () => {
    expect(() => parseXSDSchema("<not-closed")).toThrow()
  })
})
