# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Next.js dev server (port 3000)
pnpm build        # production build
pnpm start        # serve the build on port 8018
pnpm test         # vitest run (unit tests, lib/**/*.test.ts)
pnpm test:watch   # vitest watch mode
```

Tests: **Vitest** (with `jsdom`) runs `lib/**/*.test.ts`; `pnpm test` executes them. The pure logic (parser, validation, XML gen, path helpers) is unit-tested — when you change one of those modules, add/update its `*.test.ts`.

`next.config.mjs` sets `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` — **a green `pnpm build` does not mean the code typechecks**. Run `npx tsc --noEmit` when type safety matters.

Docker: `docker compose up --build` builds with `npm install --force` and serves on 8018 (`nginx.conf` proxies to 3000 and is not wired into the compose stack).

Package manager: the working tree is installed with **pnpm** (`node_modules/.pnpm`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`). Use `pnpm install` / `pnpm add`. The Dockerfile still runs `npm install --force` and there is no `package-lock.json`; don't mix in a new npm lockfile. `pnpm-workspace.yaml` only sets `allowBuilds.sharp` and pnpm's `minimumReleaseAgeExclude` (populated automatically when bumping Next).

There is no ESLint config in the tree, so `npm run lint` (which wraps the deprecated `next lint`) prompts interactively instead of running — don't rely on it.

## Architecture

A single-page Next.js 15 App Router client app (`app/page.tsx` is `"use client"`) that turns an XSD schema into a dynamic form and exports schema-conforming XML. **Everything of substance runs in the browser** — XSD parsing uses the browser `DOMParser`, and there is no server-side persistence in the active code path.

Data flow:

```
.xsd file ──parseXSDSchema()──▶ elementDef tree ──DynamicForm──▶ formData ──generateXML()──▶ XML
                                      ▲                              ▲
                          localStorage "schema:<name>"      XmlImporter / BulkUpload
```

### The elementDef tree

`parseXSDSchema` walks the XSD and produces a plain recursive object per element:
`{ name, type, baseType, minOccurs, maxOccurs, required, multiple, complexType, inputType, step, useCDATA, restrictions, attributes[], children[] }`.
Everything downstream (form rendering, validation, XML generation, CSV/Excel columns) is driven off this shape, typed by the `ElementDef` interface in `lib/xsd-parser.ts`. Changing the shape means touching all consumers.

### Extracted pure logic (`lib/`)

The non-UI logic has been pulled out of the React components into testable modules — keep new logic here, not inside components:

- `lib/xsd-parser.ts` — `parseXSDSchema` → `ElementDef` tree (browser-only, uses `DOMParser`).
- `lib/form-data.ts` — `getValueByPath` / `setValueByPath` (immutable path setter).
- `lib/validation.ts` — `validateField` / `validateFormData` (returns `{ errors, isValid }`, no state).
- `lib/xml.ts` — `escapeXml` / `isCdataEnabled` / `generateXml`.
- `lib/csv.ts` — `parseCsv` (RFC-4180-ish, handles quoted commas/newlines/quotes).
- `lib/xsd-regex.ts` — `compileXsdPattern` (anchors XSD patterns for full-match semantics).
- `lib/types.ts` — `CdataSettings`, `Errors`, `Translate`.

Only a subset of XSD is supported: a single root `element`, inline `complexType > sequence > element` (no named/global type references or `xs:include`), inline `simpleType > restriction`, and direct `attribute` children. `:scope >` selectors keep the walk to direct children.

### The XSD parser

The parser lives in **one place**: `lib/xsd-parser.ts` (`parseXSDSchema`). Both `schema-uploader.tsx` and `schema-selector.tsx` import it — there are no longer two divergent copies. If you extend the parser, edit `lib/xsd-parser.ts`; it must stay a pure/browser-only module (it uses `DOMParser`).

### formData and path strings

`DynamicForm` holds all values in one nested `formData` object rooted at the schema's root element name (`formData[schema.name]`). Fields are addressed by dot-joined path strings that double as React keys, input `id`s, and error-map keys:

- nested element: `Root.Child.Grandchild`
- array item: `Root.Items.0.Field` (numeric segment)
- attribute: `Root.Child.@attrName` (`@` prefix)

`updateFormData` / `getValueByPath` / `validateFormData` / `generateXML` / `cdataSettings` / `isCollapsed` all key off the same convention, so changing path construction in one place breaks the others silently.

### CDATA handling

Text is wrapped in `<![CDATA[...]]>` when either the schema implies it or the user toggles it per field. The schema heuristic (in `parseElement`) is narrow and hard-coded: `baseType === "string" && restrictions.pattern === ".*[^\\s].*" && restrictions.minLength === 1`. User overrides live in `cdataSettings` keyed by field path; `isCdataEnabled(path, element)` resolves override-then-schema-default. `BulkUpload` sets CDATA per *column*, which is fanned out to per-row field paths on import.

### Persistence

Schemas are stored in `localStorage` under `schema:<filename>` (raw XSD text). `SchemaSelector` enumerates, loads, renames, and deletes those keys directly. There is no server-side persistence.

### i18n

`contexts/language-context.tsx` is a hand-rolled provider with an inline `en`/`fr` dictionary and a `t(key, params)` doing `{param}` substitution; unknown keys fall through to the key itself. Language persists in `localStorage` under `language`. All user-facing strings go through `t()` — add new keys to both dictionaries.

### Import/export side paths

- `XmlImporter` reverses `generateXML`, walking the XML against the elementDef tree back into `formData`.
- `BulkUpload` fills a repeating array from CSV/Excel. Columns are the dot-paths of the array item's leaf fields; CSV parsing goes through `parseCsv` (lib/csv.ts, quoted-field aware); Excel goes through a dynamic `import("xlsx")`.
- `ArrayExport` flattens an array back out to CSV/Excel with the same column naming.

## Conventions

- shadcn/ui (default style, neutral base, CSS variables) in `components/ui/` — 50 generated primitives; regenerate via the shadcn CLI rather than hand-editing. Icons: `lucide-react`.
- `styles/globals.css` is a byte-identical orphan; the live stylesheet is `app/globals.css`.
- `@/*` maps to the repo root.
- `**/*.xsd` is gitignored, so example/test schemas will not be committed.
- The default branch is `deployed`.
