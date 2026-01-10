import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/database"
import { seedAdmin } from "./seed/admin"
import { loginLimiter, generalLimiter } from "./middleware/rateLimiter"
import authRoutes from "./routes/auth"
import entrepreneurRoutes from "./routes/entrepreneur" 
import investorRoutes from "./routes/investor"
import adminRoutes from "./routes/admin"
import intakeRoutes from "./routes/intake"
import shareRoutes from "./routes/shares"
import libraryRoutes from "./routes/library"
import notificationRoutes from "./routes/notifications"
import expenseRoutes from "./routes/expenses"
import employeeRoutes from "./routes/employees"
import payrollRoutes from "./routes/payroll"
import Business from "./models/Business"
import Terms from "./models/Terms"
import Expense from "./models/Expense"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.set('trust proxy', 1);
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Public routes (no auth required)
// Get public business listings (for browsing)
app.get("/public/businesses", generalLimiter, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query
    const pageNum = Number.parseInt(page as string) || 1
    const limitNum = Number.parseInt(limit as string) || 10

    const filter: any = { 
      status: "active", 
      type: "public" 
    }

    if (category) {
      filter.category_id = category
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ]
    }

    const businesses = await Business.find(filter)
      .populate("category_id", "name")
      .select("title category_id description image_url total_shares remaining_shares share_value minimum_shares_per_request created_at")
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    const total = await Business.countDocuments(filter)

    res.json({
      businesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get single public business by ID (for viewing details)
app.get("/public/businesses/:id", generalLimiter, async (req, res) => {
  try {
    const business = await Business.findOne({
      _id: req.params.id,
      status: "active",
      type: "public",
    })
      .populate("category_id", "name")
      .select("title category_id description image_url pdf_url total_shares remaining_shares share_value minimum_shares_per_request created_at")

    if (!business) {
      res.status(404).json({ message: "Business not found" })
      return
    }

    res.json(business)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get public terms and policy
app.get("/public/terms", generalLimiter, async (req, res) => {
  try {
    let terms = await Terms.findOne()
    if (!terms) {
      terms = await Terms.create({
        general: "",
        entrepreneur: "",
        investor: "",
      })
    }
    res.json(terms)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Routes
app.use("/auth", loginLimiter, authRoutes)
app.use("/entrepreneur", generalLimiter, entrepreneurRoutes)
app.use("/investor", generalLimiter, investorRoutes)
app.use("/admin", generalLimiter, adminRoutes)
app.use("/intake", generalLimiter, intakeRoutes)
app.use("/shares", generalLimiter, shareRoutes)
app.use("/library", generalLimiter, libraryRoutes)
app.use("/notifications", generalLimiter, notificationRoutes)
app.use("/expenses", generalLimiter, expenseRoutes)
app.use("/employees", generalLimiter, employeeRoutes)
app.use("/payroll", generalLimiter, payrollRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

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

// Scheduled task to check and create next occurrences for recursive expenses
const processRecursiveExpenses = async () => {
  try {
    const now = new Date()
    
    // Find recursive expenses that are due and need next occurrence created
    const dueRecursiveExpenses = await Expense.find({
      type: "recursive",
      is_active: true,
      due_date: { $lte: now },
      status: { $in: ["pending", "overdue"] },
    })

    for (const expense of dueRecursiveExpenses) {
      // Check if next occurrence already exists
      const nextOccurrence = await Expense.findOne({
        parent_id: expense.parent_id || expense._id,
        due_date: { $gt: expense.due_date },
        status: "pending",
      })

      if (!nextOccurrence && expense.frequency) {
        // Create next occurrence
        const nextDueDate = calculateNextDueDate(expense.due_date, expense.frequency, expense.frequency_value)
        
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

      // Update overdue status
      if (expense.due_date < now && expense.status === "pending") {
        expense.status = "overdue"
        await expense.save()
      }
    }
  } catch (error) {
    console.error("Error processing recursive expenses:", error)
  }
}

// Run the task every hour
setInterval(processRecursiveExpenses, 60 * 60 * 1000)

// Start server
const startServer = async () => {
  await connectDB()
  await seedAdmin()

  // Run once on startup
  processRecursiveExpenses()

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer()
