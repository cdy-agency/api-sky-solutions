import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/database"
import { seedAdmin } from "./seed/admin"
import authRoutes from "./routes/auth"
import entrepreneurRoutes from "./routes/entrepreneur"
import investorRoutes from "./routes/investor"
import adminRoutes from "./routes/admin"
import pubicRoutes from "./routes/public"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/auth", authRoutes)
app.use("/public", pubicRoutes)
app.use("/entrepreneur", entrepreneurRoutes)
app.use("/investor", investorRoutes)
app.use("/admin", adminRoutes)

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
