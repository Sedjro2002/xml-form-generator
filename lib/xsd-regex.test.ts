import { describe, it, expect } from "vitest"
import { compileXsdPattern } from "./xsd-regex"

describe("compileXsdPattern", () => {
  it("anchors the pattern to the whole string", () => {
    const re = compileXsdPattern("[A-Z]{3}")!
    expect(re.test("ABC")).toBe(true)
    expect(re.test("ABCD")).toBe(false)
    expect(re.test("AB")).toBe(false)
  })

  it("allows the CDATA heuristic pattern to still match", () => {
    const re = compileXsdPattern(".*[^\\s].*")!
    expect(re.test("hello")).toBe(true)
    expect(re.test(" ")).toBe(false)
    expect(re.test("")).toBe(false)
  })

  it("returns null for invalid patterns", () => {
    expect(compileXsdPattern("(")).toBeNull()
  })
})
