import { Router, type Response } from "express"
import Expense from "../models/Expense"
import { protect, authorize, type AuthRequest } from "../middleware/auth"

const router = Router()

// Get active expenses (for payroll page)
router.get("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, category, startDate, endDate, page = 1, limit = 10 } = req.query

    const query: any = {
      $or: [
        { type: "one_time", status: "active" },
        { type: "recursive", status: { $in: ["pending", "overdue"] }, is_active: true },
      ],
    }

    if (status && status !== "all") {
      if (status === "active") {
        query.$or = [{ type: "one_time", status: "active" }, { type: "recursive", status: { $in: ["pending", "overdue"] }, is_active: true }]
      } else {
        query.status = status
      }
    }

    if (priority && priority !== "all") query.priority = priority
    if (category && category !== "all") query.category = category

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
      .sort({ priority: 1, due_date: 1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Expense.countDocuments(query)

    // Calculate totals
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
    const paidAmount = expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0)
    const pendingAmount = expenses.filter((e) => e.status === "pending" || e.status === "active").reduce((sum, e) => sum + e.amount, 0)
    const overdueAmount = expenses.filter((e) => e.status === "overdue").reduce((sum, e) => sum + e.amount, 0)

    res.json({
      expenses,
      totals: {
        total: totalAmount,
        paid: paidAmount,
        pending: pendingAmount,
        overdue: overdueAmount,
      },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get payroll statistics
router.get("/statistics", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    const query: any = {
      $or: [
        { type: "one_time", status: "active" },
        { type: "recursive", status: { $in: ["pending", "overdue"] }, is_active: true },
      ],
    }

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

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
    const paidAmount = expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0)
    const pendingAmount = expenses.filter((e) => e.status === "pending" || e.status === "active").reduce((sum, e) => sum + e.amount, 0)
    const overdueAmount = expenses.filter((e) => e.status === "overdue").reduce((sum, e) => sum + e.amount, 0)

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

    res.json({
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      categoryBreakdown,
      priorityBreakdown,
      typeBreakdown,
      expenseCount: expenses.length,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
