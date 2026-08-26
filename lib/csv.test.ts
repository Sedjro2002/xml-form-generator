import { describe, it, expect } from "vitest"
import { parseCsv } from "./csv"

describe("parseCsv", () => {
  it("parses a simple CSV", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ])
  })

  it("keeps quoted commas inside a field", () => {
    expect(parseCsv('name,note\n"a,b","x,y"\n')).toEqual([
      ["name", "note"],
      ["a,b", "x,y"],
    ])
  })

  it("handles escaped quotes", () => {
    expect(parseCsv('name\n"say ""hi"""\n')).toEqual([["name"], ['say "hi"']])
  })

  it("handles quoted newlines inside a field", () => {
    expect(parseCsv('name,desc\n"a","line1\nline2"\n')).toEqual([
      ["name", "desc"],
      ["a", "line1\nline2"],
    ])
  })

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })

  it("does not drop empty trailing fields", () => {
    expect(parseCsv("a,b\n1,\n")).toEqual([
      ["a", "b"],
      ["1", ""],
    ])
  })
})
