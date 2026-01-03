import { Router, type Response } from "express"
import Payroll from "../models/Payroll"
import Invoice from "../models/Invoice"
import Employee from "../models/Employee"
import { protect, authorize, type AuthRequest } from "../middleware/auth"

const router = Router()

// ===== ADMIN-LEVEL ENDPOINTS =====

// Get all payrolls (admin view)
router.get("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, employeeId, startDate, endDate, page = 1, limit = 10 } = req.query

    const query: any = {}

    if (status && status !== "all") query.status = status
    if (employeeId) query.employee_id = employeeId

    if (startDate || endDate) {
      query.period_end = {}
      if (startDate) query.period_end.$gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        query.period_end.$lte = end
      }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const payrolls = await Payroll.find(query)
      .populate("employee_id", "name email position")
      .sort({ period_end: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Payroll.countDocuments(query)

    res.json({
      payrolls,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create payroll (admin)
router.post("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employee_id, period_start, period_end, salary, deductions, taxes, notes } = req.body

    if (!employee_id || !period_start || !period_end || salary === undefined) {
      res.status(400).json({ message: "All required fields must be provided" })
      return
    }

    const employee = await Employee.findOne({ _id: employee_id })
    if (!employee) {
      res.status(404).json({ message: "Employee not found" })
      return
    }

    const netAmount = Number.parseFloat(salary) - (Number.parseFloat(deductions) || 0) - (Number.parseFloat(taxes) || 0)

    const payroll = await Payroll.create({
      employee_id,
      period_start: new Date(period_start),
      period_end: new Date(period_end),
      salary: Number.parseFloat(salary),
      deductions: Number.parseFloat(deductions) || 0,
      taxes: Number.parseFloat(taxes) || 0,
      net_amount: netAmount,
      notes,
    })

    await payroll.populate("employee_id", "name email position")

    res.status(201).json(payroll)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get all invoices (admin view)
router.get("/invoices", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, category, startDate, endDate, page = 1, limit = 10 } = req.query

    const query: any = {}

    if (status && status !== "all") query.status = status
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
    const invoices = await Invoice.find(query)
      .sort({ due_date: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Invoice.countDocuments(query)

    res.json({
      invoices,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create invoice (admin)
router.post("/invoices", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vendor_name, amount, due_date, category, description, recurring, frequency, notes } =
        req.body

    if (!vendor_name || !amount || !due_date || !category || !description) {
      res.status(400).json({ message: "All required fields must be provided" })
      return
    }

    const invoice = await Invoice.create({
      vendor_name,
      amount: Number.parseFloat(amount),
      due_date: new Date(due_date),
      category,
      description,
      recurring: recurring === "true" || recurring === true,
      frequency,
      notes,
    })

    res.status(201).json(invoice)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// ===== PAYROLL MANAGEMENT =====

router.get("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, employeeId, startDate, endDate, page = 1, limit = 10 } = req.query

    const query: any = {}

    if (status && status !== "all") query.status = status
    if (employeeId) query.employee_id = employeeId

    if (startDate || endDate) {
      query.period_end = {}
      if (startDate) query.period_end.$gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        query.period_end.$lte = end
      }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const payrolls = await Payroll.find(query)
      .populate("employee_id", "name email position")
      .sort({ period_end: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Payroll.countDocuments(query)

    res.json({
      payrolls,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employee_id, period_start, period_end, salary, deductions, taxes, notes } = req.body

    if (!employee_id || !period_start || !period_end || salary === undefined) {
      res.status(400).json({ message: "All required fields must be provided" })
      return
    }

    const employee = await Employee.findOne({ _id: employee_id })
    if (!employee) {
      res.status(404).json({ message: "Employee not found" })
      return
    }

    const netAmount = Number.parseFloat(salary) - (Number.parseFloat(deductions) || 0) - (Number.parseFloat(taxes) || 0)

    const payroll = await Payroll.create({
      employee_id,
      period_start: new Date(period_start),
      period_end: new Date(period_end),
      salary: Number.parseFloat(salary),
      deductions: Number.parseFloat(deductions) || 0,
      taxes: Number.parseFloat(taxes) || 0,
      net_amount: netAmount,
      notes,
    })

    await payroll.populate("employee_id", "name email position")

    res.status(201).json(payroll)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.put(
  "/:payrollId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { payrollId } = req.params
      const { status, payment_date, payment_method, deductions, taxes, notes } = req.body

      const payroll = await Payroll.findOne({ _id: payrollId })

      if (!payroll) {
        res.status(404).json({ message: "Payroll not found" })
        return
      }

      if (deductions !== undefined || taxes !== undefined) {
        const newDeductions = deductions !== undefined ? Number.parseFloat(deductions) : payroll.deductions
        const newTaxes = taxes !== undefined ? Number.parseFloat(taxes) : payroll.taxes
        payroll.net_amount = payroll.salary - newDeductions - newTaxes
        payroll.deductions = newDeductions
        payroll.taxes = newTaxes
      }

      if (status) payroll.status = status
      if (payment_date) payroll.payment_date = new Date(payment_date)
      if (payment_method) payroll.payment_method = payment_method
      if (notes) payroll.notes = notes

      await payroll.save()
      await payroll.populate("employee_id", "name email position")

      res.json(payroll)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== INVOICE MANAGEMENT =====

router.get(
  "/invoices",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, category, startDate, endDate, page = 1, limit = 10 } = req.query

      const query: any = {}

      if (status && status !== "all") query.status = status
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
      const invoices = await Invoice.find(query).sort({ due_date: -1 }).skip(skip).limit(Number(limit))

      const total = await Invoice.countDocuments(query)

      res.json({
        invoices,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/invoices",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { vendor_name, amount, currency, due_date, category, description, recurring, frequency, notes } = req.body

      if (!vendor_name || !amount || !due_date || !category || !description) {
        res.status(400).json({ message: "All required fields must be provided" })
        return
      }

      const invoice = await Invoice.create({
        vendor_name,
        amount: Number.parseFloat(amount),
        due_date: new Date(due_date),
        category,
        description,
        recurring: recurring === "true",
        frequency,
        notes,
      })

      res.status(201).json(invoice)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.put(
  "/invoices/:invoiceId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params
      const { status, payment_date, payment_method } = req.body

      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId },
        {
          status,
          payment_date: payment_date ? new Date(payment_date) : undefined,
          payment_method,
        },
        { new: true, runValidators: true },
      )

      if (!invoice) {
        res.status(404).json({ message: "Invoice not found" })
        return
      }

      // If recurring and just marked paid, set next due date
      if (invoice.recurring && invoice.status === "paid" && invoice.frequency) {
        const nextDate = new Date(invoice.due_date)
        if (invoice.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7)
        else if (invoice.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1)
        else if (invoice.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3)
        else if (invoice.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1)

        invoice.next_due_date = nextDate
        await invoice.save()
      }

      res.json(invoice)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.delete(
  "/invoices/:invoiceId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params

      const invoice = await Invoice.findOneAndDelete({ _id: invoiceId })

      if (!invoice) {
        res.status(404).json({ message: "Invoice not found" })
        return
      }

      res.json({ message: "Invoice deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router
