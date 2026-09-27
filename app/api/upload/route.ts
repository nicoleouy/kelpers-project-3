import { put } from "@vercel/blob"
import { NextResponse, type NextRequest } from "next/server"
import { imageFileError, MAX_UPLOAD_BYTES } from "@/lib/uploads/rules"

export const runtime = "nodejs"

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "That photo is larger than 4 MB. Please choose a smaller image." }, { status: 413 })
  }

  let file: FormDataEntryValue | null
  try {
    file = (await request.formData()).get("file")
  } catch {
    return NextResponse.json({ error: "Upload must be multipart form data." }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo was provided." }, { status: 400 })
  }

  const invalid = imageFileError(file)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  try {
    const blob = await put(`reports/photo.${EXTENSIONS[file.type]}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[upload] Blob upload failed:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "We couldn't upload your photo. Please try again." }, { status: 502 })
  }
}
