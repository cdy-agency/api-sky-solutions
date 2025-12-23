import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import User, { type IUser } from "../models/User"

export interface AuthRequest extends Request {
  user?: IUser
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      res.status(401).json({ message: "Not authorized, no token" })
      return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as { id: string }
    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      res.status(401).json({ message: "Not authorized, user not found" })
      return
    }

    if (!user.is_active && user.role !== "admin") {
      res.status(401).json({ message: "Account not verified" })
      return
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Not authorized for this action" })
      return
    }
    next()
  }
}
