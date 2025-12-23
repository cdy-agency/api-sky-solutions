import User from "../models/User"

export const seedAdmin = async (): Promise<void> => {
  try {
    const adminExists = await User.findOne({ role: "admin" })

    if (!adminExists) {
      await User.create({
        name: "Admin",
        phone: "0000000000",
        email: "admin@example.com",
        location: "System",
        password: "Admin@123",
        role: "admin",
        is_active: true,
      })
      console.log("Default admin created: admin@example.com / Admin@123")
    }
  } catch (error) {
    console.error("Error seeding admin:", error)
  }
}
