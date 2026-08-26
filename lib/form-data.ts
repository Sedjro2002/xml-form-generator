export function getValueByPath(obj: unknown, path: string): any {
  return path.split(".").reduce<any>((current, key) => current?.[key], obj)
}

export function setValueByPath(obj: any, path: string, value: any): any {
  const parts = path.split(".")
  const root: any = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) }
  let current = root

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const nextIsArrayIndex = /^\d+$/.test(parts[i + 1])
    const existing = current[part]
    current[part] = nextIsArrayIndex
      ? Array.isArray(existing)
        ? [...existing]
        : []
      : existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...existing }
        : {}
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
  return root
}
