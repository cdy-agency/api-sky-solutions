import { Router, type Request, type Response } from "express"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import User from "../models/User"
import { sendVerificationEmail } from "../config/email" 

const router = Router()

// Register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, location, password, role } = req.body

    if (!["entrepreneur", "investor"].includes(role)) {
      res.status(400).json({ message: "Invalid role" })
      return
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: "User already exists" })
      return
    }

    const verification_token = crypto.randomBytes(32).toString("hex")
    const verification_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await User.create({
      name,
      phone,
      email,
      location,
      password,
      role,
      verification_token,
      verification_token_expires,
    })

    await sendVerificationEmail(email, verification_token)

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      userId: user._id,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Verify Email
router.get("/verify/:token", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params

    const user = await User.findOne({
      verification_token: token,
      verification_token_expires: { $gt: new Date() },
    })

    if (!user) {
      res.status(400).json({ message: "Invalid or expired verification token" })
      return
    }

    user.is_active = true
    user.verification_token = undefined
    user.verification_token_expires = undefined
    await user.save()

    res.json({ message: "Email verified successfully. You can now login." })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" })
      return
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" })
      return
    }

    if (!user.is_active && user.role !== "admin") {
      res.status(401).json({ message: "Please verify your email first" })
      return
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" })

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
