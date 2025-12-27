import { Router, type Response } from "express"
import Business from "../models/Business"
import { type AuthRequest } from "../middleware/auth"

const router = Router()

router.get("/businesses", async (req: AuthRequest, res: Response): Promise<void> => {
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

export default router