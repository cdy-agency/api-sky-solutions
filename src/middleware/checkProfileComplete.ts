import type { Response, NextFunction } from "express"
import type { AuthRequest } from "./auth"
import IntakeSubmission from "../models/IntakeSubmission"

export const checkProfileComplete = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const intake = await IntakeSubmission.findOne({
      user_id: userId,
      status: { $in: ["submitted", "approved"] },
    })

    if (!intake) {
      return res.status(403).json({
        message: "Please complete your profile intake form before proceeding",
        requiresIntake: true,
      })
    }

    next()
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
}
