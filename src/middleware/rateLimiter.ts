import rateLimit from "express-rate-limit"

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
})

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
})

export const apiLimiter = rateLimit({
  windowMs: 60 * 10000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})
