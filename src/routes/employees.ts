import { Router, type Response } from "express"
import Employee from "../models/Employee"
import EmployeeAttendance from "../models/EmployeeAttendance"
import EmployeeDocument from "../models/EmployeeDocument"
import EmployeePerformance from "../models/EmployeePerformance"
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"

const router = Router()

// ===== ADMIN-LEVEL ENDPOINTS 

// Get all employees (admin view)
router.get("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10, search,  } = req.query

    const query: any = {}

    if (status && status !== "all") query.status = status

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const employees = await Employee.find(query)
      .sort({ hire_date: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Employee.countDocuments(query)

    res.json({
      employees,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create employee (admin)
router.post("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      position,
      department,
      hire_date,
      employment_type,
      salary,
      currency,
      benefits,
      emergency_contact,
      emergency_contact_phone,
      national_id,
      passport_number,
    } = req.body

    if (!name || !email || !phone || !position || !hire_date || !employment_type || salary === undefined) {
      res.status(400).json({ message: "All required fields must be provided" })
      return
    }

    const existingEmployee = await Employee.findOne({ email })
    if (existingEmployee) {
      res.status(400).json({ message: "Employee with this email already exists" })
      return
    }

    const employee = await Employee.create({
      name,
      email,
      phone,
      position,
      department,
      hire_date: new Date(hire_date),
      employment_type,
      salary: Number.parseFloat(salary),
      currency,
      benefits: benefits ? (typeof benefits === "string" ? JSON.parse(benefits) : benefits) : [],
      emergency_contact,
      emergency_contact_phone,
      national_id,
      passport_number,
    })

    res.status(201).json(employee)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// ===== EMPLOYEE MANAGEMENT =====

router.get("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10, search } = req.query

    const query: any = {}

    if (status && status !== "all") query.status = status

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const employees = await Employee.find(query).sort({ hire_date: -1 }).skip(skip).limit(Number(limit))

    const total = await Employee.countDocuments(query)

    res.json({
      employees,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post("/", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      position,
      department,
      hire_date,
      employment_type,
      salary,
      currency,
      benefits,
      emergency_contact,
      emergency_contact_phone,
      national_id,
      passport_number,
    } = req.body

    if (!name || !email || !phone || !position || !hire_date || !employment_type || salary === undefined) {
      res.status(400).json({ message: "All required fields must be provided" })
      return
    }

    const existingEmployee = await Employee.findOne({ email })
    if (existingEmployee) {
      res.status(400).json({ message: "Employee with this email already exists" })
      return
    }

    const employee = await Employee.create({
      name,
      email,
      phone,
      position,
      department,
      hire_date: new Date(hire_date),
      employment_type,
      salary: Number.parseFloat(salary),
      currency,
      benefits: benefits ? JSON.parse(benefits) : [],
      emergency_contact,
      emergency_contact_phone,
      national_id,
      passport_number,
    })

    res.status(201).json(employee)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.put(
  "/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params

      const employee = await Employee.findOneAndUpdate({ _id: employeeId }, req.body, {
        new: true,
        runValidators: true,
      })

      if (!employee) {
        res.status(404).json({ message: "Employee not found" })
        return
      }

      res.json(employee)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.delete(
  "/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params

      const employee = await Employee.findOneAndDelete({ _id: employeeId })

      if (!employee) {
        res.status(404).json({ message: "Employee not found" })
        return
      }

      res.json({ message: "Employee deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== ATTENDANCE MANAGEMENT =====

router.get(
  "/attendance/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params
      const { startDate, endDate } = req.query

      const query: any = { employee_id: employeeId }

      if (startDate || endDate) {
        query.date = {}
        if (startDate) query.date.$gte = new Date(startDate as string)
        if (endDate) {
          const end = new Date(endDate as string)
          end.setHours(23, 59, 59, 999)
          query.date.$lte = end
        }
      }

      const attendance = await EmployeeAttendance.find(query).sort({ date: -1 })

      res.json(attendance)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/attendance/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params
      const { date, status, hours_worked, notes } = req.body

      if (!date || !status) {
        res.status(400).json({ message: "Date and status are required" })
        return
      }

      const attendance = await EmployeeAttendance.create({
        employee_id: employeeId,
        date: new Date(date),
        status,
        hours_worked: hours_worked ? Number.parseFloat(hours_worked) : 0,
        notes,
      })

      res.status(201).json(attendance)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== PERFORMANCE REVIEWS =====

router.get(
  "/performance/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params

      const reviews = await EmployeePerformance.find({ employee_id: employeeId })
        .populate("reviewer_id", "name")
        .sort({ review_date: -1 })

      res.json(reviews)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
    "/performance/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params
      const { review_date, rating, feedback, strengths, improvements } = req.body

      if (!review_date || !rating || !feedback) {
        res.status(400).json({ message: "Review date, rating, and feedback are required" })
        return
      }

      const review = await EmployeePerformance.create({
        employee_id: employeeId,
        review_date: new Date(review_date),
        rating: Number.parseInt(rating),
        feedback,
        strengths,
        improvements,
        reviewer_id: req.user!._id,
      })

      await review.populate("reviewer_id", "name")

      res.status(201).json(review)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== EMPLOYEE DOCUMENTS =====

router.get(
  "/documents/:employeeId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params

      const documents = await EmployeeDocument.find({ employee_id: employeeId }).sort({ upload_date: -1 })

      res.json(documents)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/documents/:employeeId",
  protect,
  authorize("admin"),
  upload.single("document"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params
      const { document_type } = req.body

      if (!document_type || !req.file) {
        res.status(400).json({ message: "Document type and file are required" })
        return
      }

      const result = await uploadToCloudinary(req.file.buffer, "employee-documents", req.file.mimetype.startsWith("image/") ? "image" : "raw")

      const document = await EmployeeDocument.create({
        employee_id: employeeId,
        document_type,
        document_url: result.url,
        document_public_id: result.publicId,
        file_name: req.file.originalname,
      })

      res.status(201).json(document)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.delete(
    "/documents/:documentId",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params

      const document = await EmployeeDocument.findByIdAndDelete(documentId)

      if (!document) {
        res.status(404).json({ message: "Document not found" })
        return
      }

      if (document.document_public_id) {
        await deleteFromCloudinary(document.document_public_id)
      }

      res.json({ message: "Document deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router
