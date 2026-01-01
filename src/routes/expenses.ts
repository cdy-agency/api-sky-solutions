import { Router, type Response } from "express"
import Expense from "../models/Expense"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"

const router = Router()

// Get all expenses for a business
router.get("/:businessId", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params
    const { category, status, startDate, endDate, page = 1, limit = 10 } = req.query

    const query: any = { business_id: businessId }

    if (category && category !== "all") query.category = category
    if (status && status !== "all") query.status = status

    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        query.date.$lte = end
      }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const expenses = await Expense.find(query)
      .populate("created_by", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Expense.countDocuments(query)

    res.json({
      expenses,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create expense
router.post(
  "/:businessId",
  protect,
  authorize("admin"),
  upload.single("receipt"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { businessId } = req.params
      const { category, amount, date, description, payment_method, tags } = req.body

      if (!category || !amount || !date || !description || !payment_method) {
        res.status(400).json({ message: "All required fields must be provided" })
        return
      }

      let receipt_url: string | undefined
      let receipt_public_id: string | undefined

      if (req.file) {
        const result = await uploadToCloudinary(req.file.path, "expenses")
        receipt_url = result.secure_url
        receipt_public_id = result.public_id
      }

      const expense = await Expense.create({
        business_id: businessId,
        category,
        amount: Number.parseFloat(amount),
        date: new Date(date),
        description,
        payment_method,
        receipt_url,
        receipt_public_id,
        tags: tags ? JSON.parse(tags) : [],
        created_by: req.user._id,
      })

      await expense.populate("created_by", "name email")

      res.status(201).json(expense)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Update expense
router.put(
  "/:businessId/:expenseId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { businessId, expenseId } = req.params
      const { category, amount, date, description, payment_method, status, tags } = req.body

      const expense = await Expense.findOneAndUpdate(
        { _id: expenseId, business_id: businessId },
        {
          category,
          amount: amount ? Number.parseFloat(amount) : undefined,
          date: date ? new Date(date) : undefined,
          description,
          payment_method,
          status,
          tags: tags ? JSON.parse(tags) : undefined,
        },
        { new: true, runValidators: true },
      ).populate("created_by", "name email")

      if (!expense) {
        res.status(404).json({ message: "Expense not found" })
        return
      }

      res.json(expense)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Delete expense
router.delete(
  "/:businessId/:expenseId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { businessId, expenseId } = req.params

      const expense = await Expense.findOneAndDelete({ _id: expenseId, business_id: businessId })

      if (!expense) {
        res.status(404).json({ message: "Expense not found" })
        return
      }

      if (expense.receipt_public_id) {
        await deleteFromCloudinary(expense.receipt_public_id)
      }

      res.json({ message: "Expense deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get expense analytics
router.get(
  "/:businessId/analytics/summary",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { businessId } = req.params
      const { startDate, endDate } = req.query

      const query: any = { business_id: businessId }

      if (startDate || endDate) {
        query.date = {}
        if (startDate) query.date.$gte = new Date(startDate as string)
        if (endDate) {
          const end = new Date(endDate as string)
          end.setHours(23, 59, 59, 999)
          query.date.$lte = end
        }
      }

      const expenses = await Expense.find(query)

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      const categoryBreakdown = expenses.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount
          return acc
        },
        {} as Record<string, number>,
      )

      const monthlyTrend = expenses.reduce(
        (acc, e) => {
          const month = new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "short" })
          acc[month] = (acc[month] || 0) + e.amount
          return acc
        },
        {} as Record<string, number>,
      )

      res.json({
        totalExpenses,
        categoryBreakdown,
        monthlyTrend,
        expenseCount: expenses.length,
      })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router
