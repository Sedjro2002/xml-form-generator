import { type NextRequest, NextResponse } from "next/server"
import { writeFile, readdir, readFile } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync, unlink } from "fs"

const SCHEMAS_DIR = join(process.cwd(), "saved-schemas")

// Ensure schemas directory exists
if (!existsSync(SCHEMAS_DIR)) {
  mkdirSync(SCHEMAS_DIR, { recursive: true })
}

export async function GET() {
  try {
    const files = await readdir(SCHEMAS_DIR)
    const xsdFiles = files.filter((file) => file.endsWith(".xsd") || file.endsWith(".xml"))

    const schemas = await Promise.all(
      xsdFiles.map(async (filename) => {
        const filePath = join(SCHEMAS_DIR, filename)
        const stats = await readFile(filePath, "utf-8")
        const size = Buffer.byteLength(stats, "utf-8")

        return {
          filename,
          name: filename.replace(/\.(xsd|xml)$/, ""),
          size,
          uploadDate: new Date().toISOString(), // In a real app, you'd store this metadata
        }
      }),
    )

    return NextResponse.json({ schemas })
  } catch (error) {
    console.error("Error reading schemas:", error)
    return NextResponse.json({ error: "Failed to read schemas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const content = formData.get("content") as string

    if (!file || !content) {
      return NextResponse.json({ error: "File and content are required" }, { status: 400 })
    }

    // Generate a unique filename to avoid conflicts
    var timestamp = Date.now().toString(36) // Use a timestamp for uniqueness
    const originalName = file.name.replace(/\.(xsd|xml)$/, "")
    const extension = file.name.endsWith(".xsd") ? ".xsd" : ".xml"
    // const filename = `${originalName}_${timestamp}${extension}`
    const filename = `${originalName}${extension}`

    const filePath = join(SCHEMAS_DIR, filename)
    await writeFile(filePath, content, "utf-8")

    return NextResponse.json({
      success: true,
      filename,
      message: "Schema saved successfully",
    })
  } catch (error) {
    console.error("Error saving schema:", error)
    return NextResponse.json({ error: "Failed to save schema" }, { status: 500 })
  }
}
