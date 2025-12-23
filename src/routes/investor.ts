import { Router, type Response } from "express"
import Business from "../models/Business"
import Investment from "../models/Investment"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { sendInvestmentNotification } from "../config/email"

const router = Router()

// Get all active businesses
router.get("/businesses", protect, authorize("investor"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query
    const filter: any = { status: "active" }

    if (category) filter.category = category
    if (search) {
      filter.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    const businesses = await Business.find(filter)
      .populate("entrepreneur_id", "name email location")
      .sort({ created_at: -1 })

    res.json(businesses)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get specific business
router.get(
  "/businesses/:id",
  protect,
  authorize("investor"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findOne({
        _id: req.params.id,
        status: "active",
      }).populate("entrepreneur_id", "name email location phone")

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
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { amount } = req.body
      const businessId = req.params.id

      const business = await Business.findOne({
        _id: businessId,
        status: "active",
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
        existingInvestment.amount += Number.parseFloat(amount)
        await existingInvestment.save()

         res.status(200).json({ message: "You already have a pending investment for this business. the investiment is added " })
        return
      }       

      const investment = await Investment.create({
        investor_id: req.user!._id,
        business_id: businessId,
        amount: Number.parseFloat(amount),
      })

      // await sendInvestmentNotification('rodrirwigara@gmail.com', req.user!.name, business.title, Number.parseFloat(amount))

      res.status(201).json(investment)
      return
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get investor's investments
router.get("/investments", protect, authorize("investor"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const investments = await Investment.find({ investor_id: req.user!._id })
      .populate("business_id", "title category status needed_funds")
      .sort({ created_at: -1 })

    res.json(investments)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
