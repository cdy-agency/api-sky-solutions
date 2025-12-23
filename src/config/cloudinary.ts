import { v2 as cloudinary } from "cloudinary"
import dotenv from "dotenv"
dotenv.config()
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})


export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  filename:string,
  resourceType: "image" | "raw" = "image",
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        
      
      },
    (error, result) => {
      if (error) return  reject(error)

        const downloadUrl = cloudinary.url(result!.public_id, {
          resource_type: resourceType,
          flags: "attachment",
          attachment: filename, // 👈 forces download + filename
        })
        //@ts-ignore
       resolve({ url: result!.secure_url, publicId: result!.public_id, downloadUrl: downloadUrl })
    },
  )
  uploadStream.end(fileBuffer)
})
}

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId)
}

export default cloudinary
