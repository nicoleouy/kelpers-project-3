export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] as const

export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",")

export function imageFileError(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "That file isn't a supported image. Please choose a JPG, PNG, WEBP, GIF, or HEIC photo."
  }
  if (file.size === 0) return "That image file is empty. Please choose another photo."
  if (file.size > MAX_UPLOAD_BYTES) return "That photo is larger than 4 MB. Please choose a smaller image."
  return null
}
