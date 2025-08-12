import { type NextRequest, NextResponse } from "next/server"
import { rename } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const SCHEMAS_DIR = join(process.cwd(), "saved-schemas")

export async function POST(request: NextRequest) {
  try {
    const { oldFilename, newFilename } = await request.json()

    if (!oldFilename || !newFilename) {
      return NextResponse.json({ error: "Both old and new filenames are required" }, { status: 400 })
    }

    // Ensure the new filename has the same extension as the old one
    const extension = oldFilename.split(".").pop()
    const newFilenameWithExt = newFilename.endsWith(`.${extension}`) ? newFilename : `${newFilename}.${extension}`

    const oldPath = join(SCHEMAS_DIR, oldFilename)
    const newPath = join(SCHEMAS_DIR, newFilenameWithExt)

    // Check if the old file exists
    if (!existsSync(oldPath)) {
      return NextResponse.json({ error: "Original file not found" }, { status: 404 })
    }

    // Check if the new filename already exists
    if (existsSync(newPath)) {
      return NextResponse.json({ error: "A file with this name already exists" }, { status: 409 })
    }

    // Rename the file
    await rename(oldPath, newPath)

    return NextResponse.json({
      success: true,
      oldFilename,
      newFilename: newFilenameWithExt,
      message: "Schema renamed successfully",
    })
  } catch (error) {
    console.error("Error renaming schema:", error)
    return NextResponse.json({ error: "Failed to rename schema" }, { status: 500 })
  }
}
