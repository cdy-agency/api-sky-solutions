import type { Request, Response, NextFunction } from "express"

export const validateShareRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { requested_shares, share_value } = req.body

  if (!requested_shares || !Number.isInteger(requested_shares) || requested_shares <= 0) {
    res.status(400).json({ message: "Invalid requested shares" })
    return
  }

  if (!share_value || typeof share_value !== "number" || share_value <= 0) {
    res.status(400).json({ message: "Invalid share value" })
    return
  }

  next()
}

export const validateBusinessUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { title, description, image_url, total_shares, share_value } = req.body

  if (title && typeof title !== "string") {
    res.status(400).json({ message: "Invalid title" })
    return
  }

  if (total_shares && (!Number.isInteger(total_shares) || total_shares <= 0)) {
    res.status(400).json({ message: "Invalid total shares" })
    return
  }

  if (share_value && (typeof share_value !== "number" || share_value <= 0)) {
    res.status(400).json({ message: "Invalid share value" })
    return
  }

  next()
}
