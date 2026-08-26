export function compileXsdPattern(pattern: string): RegExp | null {
  try {
    // XSD patterns match the entire string; JS `RegExp.test` is unanchored.
    return new RegExp(`^(?:${pattern})$`)
  } catch {
    return null
  }
}
