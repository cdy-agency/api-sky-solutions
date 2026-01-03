import { Router, type Response } from "express"
import { protect, type AuthRequest } from "../middleware/auth"
import { validateShareRequest } from "../middleware/validate"
import ShareRequest from "../models/ShareRequest"
import Business from "../models/Business"
import Investment from "../models/Investment"
import Notification from "../models/Notification"

const router = Router()

// Request shares
router.post(
  "/:businessId/request",
  protect,
  validateShareRequest,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { businessId } = req.params
      const { requested_shares } = req.body
      const investorId = req.user?._id

      const business = await Business.findById(businessId)
      if (!business || business.type !== "public") {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (requested_shares > business.remaining_shares) {
        res.status(400).json({ message: `Only ${business.remaining_shares} shares remaining` })
        return
      }

      const total_amount = requested_shares * business.share_value

      const shareRequest = await ShareRequest.create({
        investor_id: investorId,
        business_id: businessId,
        requested_shares,
        share_value: business.share_value,
        total_amount,
      })

      // Create notification for entrepreneur
      if (business.entrepreneur_id) {
        await Notification.create({
          user_id: business.entrepreneur_id,
          type: "share_request",
          title: "Share Request",
          message: `An investor requested ${requested_shares} shares`,
          related_id: shareRequest._id,
        })
      }

      res.status(201).json({ message: "Share request created", shareRequest })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get pending share requests (for admin)
router.get("/pending", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Number.parseInt(req.query.page as string) || 1
    const limit = Number.parseInt(req.query.limit as string) || 10

    const shareRequests = await ShareRequest.find({ status: "pending" })
      .populate("investor_id", "name email phone")
      .populate("business_id", "title")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })

    const total = await ShareRequest.countDocuments({ status: "pending" })

    res.json({
      shareRequests,
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

// Approve share request (for admin)
router.put("/:shareRequestId/approve", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shareRequestId } = req.params
    const { approved_shares } = req.body

    const shareRequest = await ShareRequest.findById(shareRequestId)
    if (!shareRequest) {
      res.status(404).json({ message: "Share request not found" })
      return
    }

    if (shareRequest.status !== "pending") {
      res.status(400).json({ message: "Share request has already been processed" })
      return
    }

    // Use approved_shares if provided, otherwise use requested_shares
    const finalApprovedShares = approved_shares || shareRequest.requested_shares

    if (finalApprovedShares > shareRequest.requested_shares) {
      res.status(400).json({ message: "Approved shares cannot exceed requested shares" })
      return
    }

    const business = await Business.findById(shareRequest.business_id)
    if (!business) {
      res.status(404).json({ message: "Business not found" })
      return
    }

    if (finalApprovedShares > business.remaining_shares) {
      res.status(400).json({ message: `Only ${business.remaining_shares} shares remaining` })
      return
    }

    // Calculate the investment amount based on approved shares
    const investmentAmount = finalApprovedShares * shareRequest.share_value

    // Update share request status
    shareRequest.status = "approved"
    await shareRequest.save()

    // Update business remaining shares
    business.remaining_shares -= finalApprovedShares
    await business.save()

    // Create investment record
    const investment = await Investment.create({
      investor_id: shareRequest.investor_id,
      business_id: shareRequest.business_id,
      amount: investmentAmount,
      status: "approved", // Auto-approved since share request was approved
    })

    // Create notification for investor
    await Notification.create({
      user_id: shareRequest.investor_id,
      type: "share_approved",
      title: "Share Request Approved",
      message: `Your request for ${finalApprovedShares} shares has been approved. Investment of ${investmentAmount.toLocaleString()} has been recorded.`,
      related_id: investment._id,
    })

    // Create notification for entrepreneur
    if (business.entrepreneur_id) {
      await Notification.create({
        user_id: business.entrepreneur_id,
        type: "share_approved",
        title: "Share Request Approved",
        message: `An investor's request for ${finalApprovedShares} shares has been approved. Investment amount: ${investmentAmount.toLocaleString()}`,
        related_id: investment._id,
      })
    }

    res.json({ 
      message: "Share request approved and investment created", 
      shareRequest,
      investment 
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Reject share request (for admin)
router.put("/:shareRequestId/reject", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shareRequestId } = req.params
    const { rejection_reason } = req.body

    const shareRequest = await ShareRequest.findById(shareRequestId)
    if (!shareRequest) {
      res.status(404).json({ message: "Share request not found" })
      return
    }

    shareRequest.status = "rejected"
    shareRequest.rejection_reason = rejection_reason
    await shareRequest.save()

    // Create notification for investor
    await Notification.create({
      user_id: shareRequest.investor_id,
      type: "share_approved",
      title: "Share Request Rejected",
      message: `Your share request has been rejected. Reason: ${rejection_reason}`,
      related_id: shareRequest._id,
    })

    res.json({ message: "Share request rejected", shareRequest })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
