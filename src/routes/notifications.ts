import { Router, type Request, type Response } from "express"
import { protect } from "../middleware/auth"
import Notification from "../models/Notification"

const router = Router()

// Get notifications
router.get("/", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const page = Number.parseInt(req.query.page as string) || 1
    const limit = Number.parseInt(req.query.limit as string) || 20

    const notifications = await Notification.find({ user_id: userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })

    const total = await Notification.countDocuments({ user_id: userId })
    const unread = await Notification.countDocuments({ user_id: userId, is_read: false })

    res.json({
      notifications,
      unread,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Mark notification as read
router.put("/:notificationId/read", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params
    const notification = await Notification.findByIdAndUpdate(notificationId, { is_read: true }, { new: true })
    res.json(notification)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Mark all as read
router.put("/mark-all-read", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    await Notification.updateMany({ user_id: userId }, { is_read: true })
    res.json({ message: "All notifications marked as read" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
