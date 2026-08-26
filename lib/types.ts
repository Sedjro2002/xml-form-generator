export type CdataSettings = Record<string, boolean>

export type Errors = Record<string, string>

export type Translate = (key: string, params?: Record<string, string | number>) => string
