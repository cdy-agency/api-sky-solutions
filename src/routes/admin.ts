import { Router, type Response } from "express"
import Business from "../models/Business"
import User from "../models/User"
import Investment from "../models/Investment"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"
import Category from "../models/category"


const router = Router()

// ===== CATEGORY MANAGEMENT =====

// Get all categories
router.get("/categories", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    res.json(categories)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create category
router.post("/categories", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, registration_fee } = req.body

    if (!name || registration_fee === undefined) {
      res.status(400).json({ message: "Name and registration fee are required" })
      return
    }

    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      res.status(400).json({ message: "Category already exists" })
      return
    }

    const category = await Category.create({
      name,
      description,
      registration_fee: Number.parseFloat(registration_fee),
    })

    res.status(201).json(category)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update category
router.put("/categories/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, registration_fee } = req.body
    const category = await Category.findById(req.params.id)

    if (!category) {
      res.status(404).json({ message: "Category not found" })
      return
    }

    if (name) category.name = name
    if (description !== undefined) category.description = description
    if (registration_fee !== undefined) category.registration_fee = Number.parseFloat(registration_fee)

    await category.save()
    res.json(category)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete category
router.delete(
  "/categories/:id",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const category = await Category.findById(req.params.id)

      if (!category) {
        res.status(404).json({ message: "Category not found" })
        return
      }

      await category.deleteOne()
      res.json({ message: "Category deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== BUSINESS MANAGEMENT =====

// Get all pending business submissions
router.get("/businesses", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status } = req.query
    const filter: any = { type: type || "submission" }

    if (status) {
      filter.status = status
    }

    const businesses = await Business.find(filter)
      .populate("entrepreneur_id", "name email phone")
      .populate("category_id", "name registration_fee")
      .populate("submission_id")
      .sort({ created_at: -1 })

    res.json(businesses)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get business details
router.get("/businesses/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await Business.findById(req.params.id)
      .populate("entrepreneur_id", "name email phone")
      .populate("category_id")
      .populate("submission_id")

    if (!business) {
      res.status(404).json({ message: "Business not found" })
      return
    }

    res.json(business)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post(
  "/businesses/:id/approve",
  protect,
  authorize("admin"),
  // upload.fields([
  //   { name: "image", maxCount: 1 },
  //   { name: "pdf", maxCount: 1 },
  // ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const submission = await Business.findById(req.params.id)

      if (!submission) {
        res.status(404).json({ message: "Submission not found" })
        return
      }

      if (submission.type !== "submission" || submission.status !== "pending") {
        res.status(400).json({ message: "Can only approve pending submissions" })
        return
      }

      // Update submission status to approved
      submission.status = req.body.status || "approved"
      
      submission.rejection_reason = req.body.rejection_reason || ""
      await submission.save()

    
      res.status(200).json(submission)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/businesses/:id/reject",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { rejection_reason } = req.body
      const submission = await Business.findById(req.params.id)

      if (!submission) {
        res.status(404).json({ message: "Submission not found" })
        return
      }

      if (submission.type !== "submission" || submission.status !== "pending") {
        res.status(400).json({ message: "Can only reject pending submissions" })
        return
      }

      submission.status = "rejected"
      submission.rejection_reason = rejection_reason || "Application rejected by admin"

      // Delete business plan from Cloudinary
      if (submission.business_plan_public_id) {
        await deleteFromCloudinary(submission.business_plan_public_id)
      }

      await submission.save()
      res.json(submission)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/businesses/public",
  protect,
  authorize("admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, category, description, needed_funds } = req.body
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }

      if (!title || !category || !description || needed_funds === undefined) {
        res.status(400).json({ message: "Title, category, description, and needed funds are required" })
        return
      }

      const cat = await Category.findById(category)
      if (!category) {
        res.status(404).json({ message: "Category not found" })
        return
      }

      let image_url: string | undefined
      let image_public_id: string | undefined
      let pdf_url: string | undefined
      let pdf_public_id: string | undefined

      if (files?.image?.[0]) {
        const imageResult = await uploadToCloudinary(files.image[0].buffer, "sky-solutions/images", "image")
        image_url = imageResult.url
        image_public_id = imageResult.publicId
      }

      if (files?.pdf?.[0]) {
        const pdfResult = await uploadToCloudinary(files.pdf[0].buffer, "sky-solutions/pdfs", "raw")
        pdf_url = pdfResult.url
        pdf_public_id = pdfResult.publicId
      }

      const business = await Business.create({
        title,
        category_id: category,
        description,
        needed_funds: Number.parseFloat(needed_funds),
        image_url,
        image_public_id,
        pdf_url,
        pdf_public_id,
        status: "active",
        type: "public",
      })

      res.status(201).json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.put(
  "/businesses/:id",
  protect,
  authorize("admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findById(req.params.id)

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (business.type !== "public") {
        res.status(400).json({ message: "Can only update public listings" })
        return
      }

      const { title, category_id, description, needed_funds, status } = req.body
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }

      if (files?.image?.[0]) {
        if (business.image_public_id) {
          await deleteFromCloudinary(business.image_public_id)
        }
        const imageResult = await uploadToCloudinary(files.image[0].buffer, "sky-solutions/images", "image")
        business.image_url = imageResult.url
        business.image_public_id = imageResult.publicId
      }

      if (files?.pdf?.[0]) {
        if (business.pdf_public_id) {
          await deleteFromCloudinary(business.pdf_public_id)
        }
        const pdfResult = await uploadToCloudinary(files.pdf[0].buffer, "sky-solutions/pdfs", "raw")
        business.pdf_url = pdfResult.url
        business.pdf_public_id = pdfResult.publicId
      }

      if (title) business.title = title
      if (category_id) business.category_id = category_id
      if (description) business.description = description
      if (needed_funds) business.needed_funds = Number.parseFloat(needed_funds)
      if (status) business.status = status

      await business.save()
      res.json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Delete business
router.delete(
  "/businesses/:id",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findById(req.params.id)

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (business.image_public_id) {
        await deleteFromCloudinary(business.image_public_id)
      }
      if (business.pdf_public_id) {
        await deleteFromCloudinary(business.pdf_public_id)
      }

      await business.deleteOne()
      res.json({ message: "Business deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== USER MANAGEMENT =====

// Get all users
router.get("/users", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, is_active } = req.query
    const filter: any = {}

    if (role) filter.role = role
    if (is_active !== undefined) filter.is_active = is_active === "true"

    const users = await User.find(filter)
      .select("-password -verification_token -verification_token_expires")
      .sort({ created_at: -1 })

    res.json(users)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete user
router.delete("/users/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    if (user.role === "admin") {
      res.status(400).json({ message: "Cannot delete admin user" })
      return
    }

    await user.deleteOne()
    res.json({ message: "User deleted successfully" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update user status
router.patch(
  "/users/:id/status",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { is_active } = req.body
      const user = await User.findById(req.params.id)

      if (!user) {
        res.status(404).json({ message: "User not found" })
        return
      }

      user.is_active = is_active
      await user.save()

      res.json({ message: `User ${is_active ? "activated" : "deactivated"} successfully` })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== INVESTMENT MANAGEMENT =====

// Get all investments
router.get("/investments", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const investments = await Investment.find()
      .populate("investor_id", "name email")
      .populate("business_id", "title category")
      .sort({ created_at: -1 })

    res.json(investments)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update investment status
router.patch(
  "/investments/:id/status",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => { 
    try {
      const { status } = req.body
      const investment = await Investment.findById(req.params.id)
    
      if (!investment) {
        res.status(404).json({ message: "Investment not found" })
        return
      }
      const business = await Business.findById(investment.business_id)
      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }
      // Update business funded amount if investment is approved
      if (status === "approved") {
        business.funded_amount += investment.amount
        await business.save()
      } 

      investment.status = status
      await investment.save()

      res.json(investment)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== DASHBOARD STATS =====

// Dashboard stats
router.get("/stats", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      totalInvestments,
      activeBusinesses,
      pendingInvestments,
      entrepreneurs,
      investors,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Business.countDocuments(),
      Investment.countDocuments(),
      Business.countDocuments({ status: "active" }),
      Investment.countDocuments({ status: "pending" }),
      User.countDocuments({ role: "entrepreneur" }),
      User.countDocuments({ role: "investor" }),
    ])

    const totalFundingRequested = await Business.aggregate([
      { $group: { _id: null, total: { $sum: "$needed_funds" } } },
    ])

    const totalInvestmentAmount = await Investment.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])

    res.json({
      totalUsers,
      totalBusinesses,
      totalInvestments,
      activeBusinesses,
      pendingInvestments,
      entrepreneurs,
      investors,
      totalFundingRequested: totalFundingRequested[0]?.total || 0,
      totalInvestmentAmount: totalInvestmentAmount[0]?.total || 0,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
