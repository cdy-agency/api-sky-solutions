import { Router, type Response } from "express"
import Business from "../models/Business"
import Investment from "../models/Investment"
import ShareRequest from "../models/ShareRequest"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { sendInvestmentNotification } from "../config/email"
import { checkProfileComplete } from "../middleware/checkProfileComplete"

const router = Router()

// Get all active businesses
router.get(
  "/businesses",
  protect,
  authorize("investor"),
  checkProfileComplete,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { category, search } = req.query
      const filter: any = { status: "active", type: "public" }

      if (category) filter.category_id = category
      if (search) {
        filter.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
      }

      const businesses = await Business.find(filter)
        .populate("category_id", "name")
        .select(
          "title category_id description image_url total_shares remaining_shares share_value minimum_shares_per_request",
        )
        .sort({ created_at: -1 })

      res.json(businesses)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get specific business
router.get(
  "/businesses/:id",
  protect,
  authorize("investor"),
  checkProfileComplete,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findOne({
        _id: req.params.id,
        status: "active",
        type: "public",
      })
        .populate("category_id", "name")
        .select(
          "title category_id description image_url pdf_url total_shares remaining_shares share_value minimum_shares_per_request",
        )

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

// Request to invest
router.post(
  "/businesses/:id/invest",
  protect,
  authorize("investor"),
  checkProfileComplete,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { amount } = req.body
      const businessId = req.params.id

      const business = await Business.findOne({
        _id: businessId,
        status: "active",
        type: "public",
      }).populate("entrepreneur_id", "name email")

      if (!business) {
        res.status(404).json({ message: "Business not found or not active" })
        return
      }

      const existingInvestment = await Investment.findOne({
        investor_id: req.user!._id,
        business_id: businessId,
        status: "pending",
      })

      if (existingInvestment) {
        res.status(400).json({ message: "You already have a pending investment for this business" })
        return
      }

      const investment = await Investment.create({
        investor_id: req.user!._id,
        business_id: businessId,
        amount: Number.parseFloat(amount),
      })

      const entrepreneur = business.entrepreneur_id as any
      await sendInvestmentNotification(entrepreneur.email, business.title, Number.parseFloat(amount))

      res.status(201).json(investment)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/businesses/:id/request-shares",
  protect,
  authorize("investor"),
  checkProfileComplete,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { requested_shares } = req.body
      const businessId = req.params.id

      const business = await Business.findOne({
        _id: businessId,
        status: "active",
        type: "public",
      })

      if (!business) {
        res.status(404).json({ message: "Business not found or not active" })
        return
      }

      if (business.minimum_shares_per_request && requested_shares < business.minimum_shares_per_request) {
        res.status(400).json({
          message: `Minimum shares per request is ${business.minimum_shares_per_request}`,
        })
        return
      }

      const existingRequest = await ShareRequest.findOne({
        investor_id: req.user!._id,
        business_id: businessId,
        status: "pending",
      })

      if (existingRequest) {
        res.status(400).json({ message: "You already have a pending share request for this business" })
        return
      }

      const total_amount = requested_shares * business.share_value

      const shareRequest = await ShareRequest.create({
        investor_id: req.user!._id,
        business_id: businessId,
        requested_shares,
        share_value: business.share_value,
        total_amount,
      })

      res.status(201).json(shareRequest)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.get(
  "/share-requests",
  protect,
  authorize("investor"),
  checkProfileComplete,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const shareRequests = await ShareRequest.find({ investor_id: req.user!._id })
        .populate("business_id", "title category_id")
        .populate({
          path: "business_id",
          populate: {
            path: "category_id",
            select: "name",
          },
        })
        .sort({ created_at: -1 })

      res.json(shareRequests)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get investor's investments
router.get(
  "/investments",
  protect,
  authorize("investor"),
  checkProfileComplete,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const investments = await Investment.find({ investor_id: req.user!._id })
        .populate("business_id", "title category status needed_funds")
        .sort({ created_at: -1 })

      res.json(investments)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router
