import { type NextRequest, NextResponse } from "next/server"
import { readFile, unlink } from "fs/promises"
import { join } from "path"

const SCHEMAS_DIR = join(process.cwd(), "saved-schemas")

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const x = await params
    const filename = x.filename
    const filePath = join(SCHEMAS_DIR, filename)
    const content = await readFile(filePath, "utf-8")

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error reading schema file:", error)
    return NextResponse.json({ error: "Schema file not found" }, { status: 404 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const x = await params
    const filename = x.filename
    const filePath = join(SCHEMAS_DIR, filename)

    await unlink(filePath)

    return NextResponse.json({
      success: true,
      message: "Schema deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting schema file:", error)
    return NextResponse.json({ error: "Failed to delete schema" }, { status: 500 })
  }
}
