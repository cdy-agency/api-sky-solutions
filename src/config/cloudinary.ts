import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" = "image",
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve({ url: result!.secure_url, publicId: result!.public_id })
      },
    )
    uploadStream.end(fileBuffer)
  })
}

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId)
}

export const getSignedDownloadUrl = async (
  publicId: string,
  resourceType: "image" | "raw" = "raw",
  expiresIn: number = 3600,
): Promise<string> => {
  return cloudinary.utils.private_download_url(publicId, resourceType, {
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  })
}

export const getOptimizedUrl = (publicId: string, resourceType: "image" | "raw" = "raw"): string => {
  if (resourceType === "image") {
    return cloudinary.url(publicId, {
      secure: true,
      fetch_format: "auto",
      quality: "auto",
    })
  }
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
  })
}

export default cloudinary
