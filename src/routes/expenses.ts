import { Router, type Response } from "express"
import Expense from "../models/Expense"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"

const router = Router()

// Helper function to calculate next due date for recursive expenses
const calculateNextDueDate = (currentDueDate: Date, frequency: string, frequencyValue?: number): Date => {
  const nextDate = new Date(currentDueDate)
  
  switch (frequency) {
    case "days":
      nextDate.setDate(nextDate.getDate() + (frequencyValue || 1))
      break
    case "month":
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case "quarter":
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case "half":
      nextDate.setMonth(nextDate.getMonth() + 6)
      break
    case "year":
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      nextDate.setMonth(nextDate.getMonth() + 1)
  }
  
  return nextDate
}

// Get all expenses (admin view)
router.get("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status, type, priority, startDate, endDate, page = 1, limit = 10 } = req.query

    const query: any = {}

    if (category && category !== "all") query.category = category
    if (status && status !== "all") query.status = status
    if (type && type !== "all") query.type = type
    if (priority && priority !== "all") query.priority = priority

    if (startDate || endDate) {
      query.due_date = {}
      if (startDate) query.due_date.$gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        query.due_date.$lte = end
      }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const expenses = await Expense.find(query)
      .populate("created_by", "name email")
      .populate("parent_id", "name")
      .sort({ due_date: -1, priority: 1 })
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

// Get active expenses (for payroll page)
router.get("/active", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expenses = await Expense.find({
      $or: [
        { type: "one_time", status: "active" },
        { type: "recursive", status: { $in: ["pending", "overdue"] }, is_active: true },
      ],
    })
      .populate("created_by", "name email")
      .sort({ due_date: 1, priority: 1 })

    res.json(expenses)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create expense (admin)
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("receipt"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        category,
        amount,
        type,
        priority,
        due_date,
        description,
        payment_method,
        tags,
        frequency,
        frequency_value,
      } = req.body

      if (!name || !category || !amount || !type || !due_date) {
        res.status(400).json({ message: "Name, category, amount, type, and due_date are required" })
        return
      }

      // Validate recursive expense fields
      if (type === "recursive") {
        if (!frequency) {
          res.status(400).json({ message: "Frequency is required for recursive expenses" })
          return
        }
        if (frequency === "days" && !frequency_value) {
          res.status(400).json({ message: "Frequency value is required for days frequency" })
          return
        }
      }

      let receipt_url: string | undefined
      let receipt_public_id: string | undefined

      if (req.file) {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "expenses",
          req.file.mimetype.startsWith("image/") ? "image" : "raw",
        )
        receipt_url = result.url
        receipt_public_id = result.publicId
      }

      // Set initial status based on type
      let status: "active" | "pending" = type === "one_time" ? "active" : "pending"

      const expense = await Expense.create({
        name,
        category,
        amount: Number.parseFloat(amount),
        type,
        priority: priority || "medium",
        due_date: new Date(due_date),
        description,
        payment_method,
        receipt_url,
        receipt_public_id,
        tags: tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [],
        status,
        frequency: type === "recursive" ? frequency : undefined,
        frequency_value: type === "recursive" && frequency === "days" ? Number.parseInt(frequency_value) : undefined,
        is_active: type === "recursive" ? true : undefined,
        created_by: req.user!._id,
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
  "/:expenseId",
  protect,
  authorize("admin"),
  upload.single("receipt"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { expenseId } = req.params
      const {
        name,
        category,
        amount,
        type,
        priority,
        due_date,
        paid_date,
        description,
        payment_method,
        status,
        tags,
        frequency,
        frequency_value,
        is_active,
      } = req.body

      const expense = await Expense.findById(expenseId)

      if (!expense) {
        res.status(404).json({ message: "Expense not found" })
        return
      }

      // Handle receipt upload
      let receipt_url = expense.receipt_url
      let receipt_public_id = expense.receipt_public_id

      if (req.file) {
        // Delete old receipt if exists
        if (expense.receipt_public_id) {
          await deleteFromCloudinary(expense.receipt_public_id)
        }
        const result = await uploadToCloudinary(
          req.file.buffer,
          "expenses",
          req.file.mimetype.startsWith("image/") ? "image" : "raw",
        )
        receipt_url = result.url
        receipt_public_id = result.publicId
      }

      // Update fields
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (category !== undefined) updateData.category = category
      if (amount !== undefined) updateData.amount = Number.parseFloat(amount)
      if (type !== undefined) updateData.type = type
      if (priority !== undefined) updateData.priority = priority
      if (due_date !== undefined) updateData.due_date = new Date(due_date)
      if (paid_date !== undefined) updateData.paid_date = paid_date ? new Date(paid_date) : null
      if (description !== undefined) updateData.description = description
      if (payment_method !== undefined) updateData.payment_method = payment_method
      if (status !== undefined) updateData.status = status
      if (tags !== undefined) updateData.tags = typeof tags === "string" ? JSON.parse(tags) : tags
      if (frequency !== undefined) updateData.frequency = frequency
      if (frequency_value !== undefined) updateData.frequency_value = frequency_value ? Number.parseInt(frequency_value) : undefined
      if (is_active !== undefined) updateData.is_active = is_active === "true" || is_active === true

      // If marking as paid and it's a recursive expense, create next occurrence
      if (status === "paid" && expense.type === "recursive" && expense.is_active) {
        const nextDueDate = calculateNextDueDate(
          updateData.due_date || expense.due_date,
          updateData.frequency || expense.frequency!,
          updateData.frequency_value || expense.frequency_value,
        )

        // Create next occurrence
        await Expense.create({
          name: expense.name,
          category: expense.category,
          amount: expense.amount,
          type: "recursive",
          priority: expense.priority,
          due_date: nextDueDate,
          description: expense.description,
          payment_method: expense.payment_method,
          status: "pending",
          frequency: expense.frequency,
          frequency_value: expense.frequency_value,
          parent_id: expense.parent_id || expense._id,
          is_active: true,
          created_by: expense.created_by,
        })
      }

      updateData.receipt_url = receipt_url
      updateData.receipt_public_id = receipt_public_id

      const updatedExpense = await Expense.findByIdAndUpdate(expenseId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("created_by", "name email")
        .populate("parent_id", "name")

      res.json(updatedExpense)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Mark expense as paid
router.patch(
  "/:expenseId/paid",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { expenseId } = req.params
      const { paid_date, payment_method } = req.body

      if (!payment_method) {
        res.status(400).json({ message: "Payment method is required" })
        return
      }

      const expense = await Expense.findById(expenseId)

      if (!expense) {
        res.status(404).json({ message: "Expense not found" })
        return
      }

      const updateData: any = {
        status: expense.type === "one_time" ? "paid" : "paid",
        paid_date: paid_date ? new Date(paid_date) : new Date(),
        payment_method: payment_method,
      }

      // If recursive and active, create next occurrence
      if (expense.type === "recursive" && expense.is_active) {
        const nextDueDate = calculateNextDueDate(
          expense.due_date,
          expense.frequency!,
          expense.frequency_value,
        )

        await Expense.create({
          name: expense.name,
          category: expense.category,
          amount: expense.amount,
          type: "recursive",
          priority: expense.priority,
          due_date: nextDueDate,
          description: expense.description,
          payment_method: expense.payment_method,
          status: "pending",
          frequency: expense.frequency,
          frequency_value: expense.frequency_value,
          parent_id: expense.parent_id || expense._id,
          is_active: true,
          created_by: expense.created_by,
        })
      }

      const updatedExpense = await Expense.findByIdAndUpdate(expenseId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("created_by", "name email")
        .populate("parent_id", "name")

      res.json(updatedExpense)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Toggle recursive expense active/stopped
router.patch(
  "/:expenseId/toggle-active",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { expenseId } = req.params

      const expense = await Expense.findById(expenseId)

      if (!expense) {
        res.status(404).json({ message: "Expense not found" })
        return
      }

      if (expense.type !== "recursive") {
        res.status(400).json({ message: "Only recursive expenses can be toggled" })
        return
      }

      expense.is_active = !expense.is_active
      await expense.save()

      res.json(expense)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Delete expense
router.delete(
  "/:expenseId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { expenseId } = req.params

      const expense = await Expense.findById(expenseId)

      if (!expense) {
        res.status(404).json({ message: "Expense not found" })
        return
      }

      // Delete receipt if exists
      if (expense.receipt_public_id) {
        await deleteFromCloudinary(expense.receipt_public_id)
      }

      await Expense.findByIdAndDelete(expenseId)

      res.json({ message: "Expense deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get expense statistics
router.get(
  "/statistics",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query

      const query: any = {}

      if (startDate || endDate) {
        query.due_date = {}
        if (startDate) query.due_date.$gte = new Date(startDate as string)
        if (endDate) {
          const end = new Date(endDate as string)
          end.setHours(23, 59, 59, 999)
          query.due_date.$lte = end
        }
      }

      const expenses = await Expense.find(query)

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      const paidExpenses = expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0)
      const pendingExpenses = expenses.filter((e) => e.status === "pending" || e.status === "active").reduce((sum, e) => sum + e.amount, 0)
      const overdueExpenses = expenses.filter((e) => e.status === "overdue").reduce((sum, e) => sum + e.amount, 0)

      const categoryBreakdown = expenses.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount
          return acc
        },
        {} as Record<string, number>,
      )

      const priorityBreakdown = expenses.reduce(
        (acc, e) => {
          acc[e.priority] = (acc[e.priority] || 0) + e.amount
          return acc
        },
        {} as Record<string, number>,
      )

      const typeBreakdown = expenses.reduce(
        (acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + e.amount
          return acc
        },
        {} as Record<string, number>,
      )

      const monthlyTrend = expenses.reduce(
        (acc, e) => {
          const month = new Date(e.due_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })
          acc[month] = (acc[month] || 0) + e.amount
          return acc
        },
        {} as Record<string, number>,
      )

      res.json({
        totalExpenses,
        paidExpenses,
        pendingExpenses,
        overdueExpenses,
        categoryBreakdown,
        priorityBreakdown,
        typeBreakdown,
        monthlyTrend,
        expenseCount: expenses.length,
        paidCount: expenses.filter((e) => e.status === "paid").length,
        pendingCount: expenses.filter((e) => e.status === "pending" || e.status === "active").length,
        overdueCount: expenses.filter((e) => e.status === "overdue").length,
      })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Legacy endpoint for analytics (keeping for backward compatibility)
router.get(
  "/analytics/summary",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query

      const query: any = {}

      if (startDate || endDate) {
        query.due_date = {}
        if (startDate) query.due_date.$gte = new Date(startDate as string)
        if (endDate) {
          const end = new Date(endDate as string)
          end.setHours(23, 59, 59, 999)
          query.due_date.$lte = end
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
          const month = new Date(e.due_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })
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
