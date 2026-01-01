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

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

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

// Start server
const startServer = async () => {
  await connectDB()
  await seedAdmin()

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer()
