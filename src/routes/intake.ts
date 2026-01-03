import { Router, type Response } from "express"
import IntakeSubmission from "../models/IntakeSubmission"
import User from "../models/User"
import { protect, type AuthRequest } from "../middleware/auth"

const router = Router()

// Get all forms for a user
router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissions = await IntakeSubmission.find({ user_id: req.user!._id }).sort({ created_at: -1 })
    res.json(submissions)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create new form
router.post("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { form_type, ...data } = req.body

    if (!form_type || !["ideation", "active_business", "investor"].includes(form_type)) {
      res.status(400).json({ message: "Invalid form type" })
      return
    }

    const submission = await IntakeSubmission.create({
      user_id: req.user!._id,
      full_name: data.full_legal_name,
      form_type,
      ...data,
      status: "pending",
    })

    res.status(201).json(submission)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get specific form
router.get("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submission = await IntakeSubmission.findOne({
      _id: req.params.id,
      user_id: req.user!._id,
    })

    if (!submission) {
      res.status(404).json({ message: "Form not found" })
      return
    }

    res.json(submission)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update form
router.put("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submission = await IntakeSubmission.findOne({
      _id: req.params.id,
      user_id: req.user!._id,
    })

    if (!submission) {
      res.status(404).json({ message: "Form not found" })
      return
    }

    if (submission.status !== "pending") {
      res.status(400).json({ message: "Can only edit draft forms" })
      return
    }

    Object.assign(submission, req.body)
    await submission.save()

    res.json(submission)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Submit form (change status from draft to submitted)
router.post("/:id/submit", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submission = await IntakeSubmission.findOne({
      _id: req.params.id,
      user_id: req.user!._id,
    })

    if (!submission) {
      res.status(404).json({ message: "Form not found" })
      return
    }

    if (submission.status !== "pending") {
      res.status(400).json({ message: "Can only submit pending forms" })
      return
    }

    submission.status = "submitted"
    submission.signature_date = new Date()
    await submission.save()

    await User.findByIdAndUpdate(req.user!._id, {
      intake_completed: true,
      intake_completed_at: new Date(),
    })

    res.json(submission)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete form pending only
router.delete("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submission = await IntakeSubmission.findOne({
      _id: req.params.id,
      user_id: req.user!._id,
    })

    if (!submission) {
      res.status(404).json({ message: "Form not found" })
      return
    }

    if (submission.status !== "pending") {
      res.status(400).json({ message: "Can only delete pending forms" })
      return
    }

    await IntakeSubmission.deleteOne({ _id: req.params.id })
    res.json({ message: "Form deleted" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
