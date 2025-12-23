import { Router, type Response, type Request } from "express"
import Business from "../models/Business"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"
import Category from "../models/Category"

const router = Router()

// Get all categories
router.get("/categories", async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    res.json(categories)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Submit business application (entrepreneur only submits: title, category, business_plan)
router.post(
  "/business",
  protect,
  authorize("entrepreneur"),
  upload.single("businessPlan"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, category } = req.body

      // Validate required fields
      if (!title || !category) {
        res.status(400).json({ message: "Title and category are required" })
        return
      }

      // Check if category exists
      const cat = await Category.findById(category)
      if (!cat) {
        res.status(404).json({ message: "Category not found" })
        return
      }

      let business_plan_url: string | undefined
      let business_plan_public_id: string | undefined
      let business_plan_download_url: string | undefined

      if (req.file) {
        const planResult = await uploadToCloudinary(req.file.buffer, "sky-solutions/business-plans", "raw")
        business_plan_url = planResult.url
        //@ts-expect-error error
        business_plan_download_url = planResult.downloadUrl
        business_plan_public_id = planResult.publicId
      }

      const business = await Business.create({
        entrepreneur_id: req.user!._id,
        title,
        category_id:cat._id,
        business_plan_url,
        business_plan_download_url,
        business_plan_public_id,
        status: "pending",
        type: "submission",
      })

      res.status(201).json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.get("/business", protect, authorize("entrepreneur"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businesses = await Business.find({
      entrepreneur_id: req.user!._id,
      type: "submission",
    })
      .populate("category_id")
      .sort({
        created_at: -1,
      })
    res.json(businesses)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get specific business application
router.get(
  "/business/:id",
  protect,
  authorize("entrepreneur"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findOne({
        _id: req.params.id,
        entrepreneur_id: req.user!._id,
      }).populate("category_id")

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      res.json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Update business application (only before approval)
router.put(
  "/business/:id",
  protect,
  authorize("entrepreneur"),
  upload.single("business_plan"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findOne({
        _id: req.params.id,
        entrepreneur_id: req.user!._id,
      })

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (business.status !== "pending") {
        res.status(400).json({ message: "Can only update pending business applications" })
        return
      }

      const { title, category_id } = req.body

      if (title) business.title = title
      if (category_id) {
        const category = await Category.findById(category_id)
        if (!category) {
          res.status(404).json({ message: "Category not found" })
          return
        }
        business.category_id = category_id
      }

      if (req.file) {
        if (business.business_plan_public_id) {
          await deleteFromCloudinary(business.business_plan_public_id)
        }
        const planResult = await uploadToCloudinary(req.file.buffer, "sky-solutions/business-plans", "raw")
        business.business_plan_url = planResult.url
        business.business_plan_public_id = planResult.publicId
      }

      await business.save()
      res.json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router

