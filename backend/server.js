const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const cors = require("cors")
const nodemailer = require("nodemailer")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

const app = express()

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// MongoDB connection with better error handling
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://muralikarthickm22it:Murali%40123@cluster0.mongodb.net/cloudcomputing?retryWrites=true&w=majority"

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully")
    console.log("Database:", mongoose.connection.db.databaseName)
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err)
    process.exit(1)
  })

// User schema for authentication
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: { type: String, required: true, minlength: 6 },
    hasApplication: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
)

const User = mongoose.model("User", userSchema)

// Enhanced Mongoose schema with interview results
const applicantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    phone: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    experience: { type: String, trim: true },
    education: { type: String, required: true, trim: true },
    linkedin: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    github: { type: String, trim: true },
    role: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    resumeUrl: String,
    resumeFileName: String,
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "interview_completed"],
      default: "pending",
    },
    interviewCode: String,
    interviewCodeExpiry: Date,
    interviewResults: {
      aptitudeScore: { type: Number, default: 0 },
      codingScore: { type: Number, default: 0 },
      hrScore: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      aptitudeAnswers: [
        {
          question: String,
          selectedAnswer: String,
          correctAnswer: String,
          isCorrect: Boolean,
        },
      ],
      codingAnswers: [
        {
          question: String,
          solution: String,
          score: Number,
        },
      ],
      hrAnswers: [
        {
          question: String,
          answer: String,
          score: Number,
        },
      ],
      completedAt: Date,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
)

// Add indexes for better performance
applicantSchema.index({ email: 1 })
applicantSchema.index({ status: 1 })
applicantSchema.index({ createdAt: -1 })

const Applicant = mongoose.model("Applicant", applicantSchema, "client")

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here"

// Fixed Email configuration - Using Ethereal for testing
let transporter

// Create test account and transporter
const createTransporter = async () => {
  try {
    // Create a test account for development
    const testAccount = await nodemailer.createTestAccount()

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })

    console.log("✅ Email transporter created with test account")
    console.log("📧 Test email credentials:", testAccount.user)

    // Test the connection
    await transporter.verify()
    console.log("✅ Email server connection verified")
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error)
    // Fallback to a simple transporter that logs emails
    transporter = {
      sendMail: async (mailOptions) => {
        console.log("📧 Email would be sent:", {
          to: mailOptions.to,
          subject: mailOptions.subject,
          preview: mailOptions.html.substring(0, 100) + "...",
        })
        return { messageId: "test-" + Date.now() }
      },
    }
    console.log("✅ Fallback email logger created")
  }
}

// Initialize transporter
createTransporter()

// Generate random interview code
const generateInterviewCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: '"AI Interview Platform" <noreply@aiinterview.com>',
      to,
      subject,
      html,
    })

    console.log(`✅ Email sent to ${to}`)

    // Only try to get preview URL if it's a real nodemailer transporter
    if (info && info.messageId && info.messageId.includes("@ethereal.email")) {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      if (previewUrl) {
        console.log("📧 Preview URL:", previewUrl)
      }
    }

    return info
  } catch (error) {
    console.error("❌ Email sending failed:", error)
    // Don't throw error to prevent breaking the flow
    return null
  }
}

// Multer setup for file upload with better error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only TXT, PDF, DOC, and DOCX are allowed."))
    }
  },
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  })
})

// Client signup endpoint
app.post("/api/client/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body
    console.log(`📝 User signup attempt: ${email}`)

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    })

    await user.save()
    console.log(`✅ User created: ${email}`)

    res.json({ success: true, message: "Account created successfully" })
  } catch (err) {
    console.error("❌ Signup error:", err)
    res.status(500).json({ error: "Failed to create account" })
  }
})

// Client login endpoint
app.post("/api/client/login", async (req, res) => {
  try {
    const { email, password } = req.body
    console.log(`🔐 Login attempt: ${email}`)

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(400).json({ error: "Invalid email or password" })
    }

    // Check if user has application
    const application = await Applicant.findOne({ email: email.toLowerCase().trim() })
    const hasApplication = !!application

    // Update user's hasApplication status
    await User.findByIdAndUpdate(user._id, { hasApplication })

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    console.log(`✅ Login successful: ${email}`)

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        hasApplication,
        ...(application && {
          phone: application.phone,
          institution: application.institution,
          address: application.address,
          experience: application.experience,
          education: application.education,
          linkedin: application.linkedin,
          portfolio: application.portfolio,
          github: application.github,
          role: application.role,
          skills: application.skills,
        }),
      },
      token,
    })
  } catch (err) {
    console.error("❌ Login error:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

// Endpoint to get application data
app.get("/api/client/application", async (req, res) => {
  try {
    const { email } = req.query
    console.log(`🔍 Fetching application for email: ${email}`)

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    const application = await Applicant.findOne({ email: email.toLowerCase().trim() })
    console.log(`📋 Application found for ${email}: ${!!application}`)

    if (!application) {
      return res.status(404).json({ error: "Application not found" })
    }

    res.json(application)
  } catch (err) {
    console.error("❌ Get application error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Endpoint to receive client application
app.post("/api/client/apply", upload.single("resume"), async (req, res) => {
  try {
    console.log("📝 Received application submission")
    console.log("Body:", req.body)
    console.log("File:", req.file ? req.file.filename : "No file")

    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Check if application already exists
    const exists = await Applicant.exists({ email: email.toLowerCase().trim() })
    if (exists) {
      console.log(`⚠️ Application already exists for email: ${email}`)
      return res.status(400).json({ error: "Application already submitted for this email." })
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(400).json({ error: "User not found. Please sign up first." })
    }

    const { name, phone, institution, address, experience, education, linkedin, portfolio, github, role, skills } =
      req.body

    // Validate required fields
    if (!name || !phone || !institution || !education || !req.file) {
      return res.status(400).json({ error: "Required fields and resume file are missing" })
    }

    const resumeUrl = `/uploads/${req.file.filename}`

    const applicant = new Applicant({
      userId: user._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      institution: institution.trim(),
      address: address?.trim() || "",
      experience: experience?.trim() || "",
      education: education.trim(),
      linkedin: linkedin?.trim() || "",
      portfolio: portfolio?.trim() || "",
      github: github?.trim() || "",
      role: role?.trim() || "",
      skills: skills ? JSON.parse(skills) : [],
      resumeUrl,
      resumeFileName: req.file.originalname,
      status: "pending",
    })

    await applicant.save()
    console.log(`✅ Application saved for: ${email}`)

    // Update user's hasApplication status
    await User.findByIdAndUpdate(user._id, { hasApplication: true })

    // Send confirmation email to applicant
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Application Received Successfully!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for submitting your application. We have received your details and resume.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Application Summary:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role || "General Position"}</p>
          <p><strong>Institution:</strong> ${institution}</p>
        </div>
        <p>Our team will review your application and get back to you within 2-3 business days.</p>
        <p>Best regards,<br>The Recruitment Team</p>
      </div>
    `

    await sendEmail(email, "Application Received - AI Interview Platform", confirmationHtml)

    res.json({ success: true, message: "Application submitted successfully" })
  } catch (err) {
    console.error("❌ Apply error:", err)
    if (err.code === 11000) {
      // Duplicate key error
      res.status(400).json({ error: "Application already exists for this email" })
    } else {
      res.status(500).json({ error: "Failed to save application data" })
    }
  }
})

// Endpoint to update client profile
app.put("/api/client/update-profile", async (req, res) => {
  try {
    const { email, ...updateData } = req.body
    console.log(`📝 Updating profile for: ${email}`)

    const applicant = await Applicant.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        ...updateData,
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!applicant) {
      return res.status(404).json({ error: "Application not found" })
    }

    console.log(`✅ Profile updated for: ${email}`)
    res.json({ success: true, message: "Profile updated successfully", applicant })
  } catch (err) {
    console.error("❌ Update profile error:", err)
    res.status(500).json({ error: "Failed to update profile" })
  }
})

// Admin endpoint to get all applicants with enhanced data
app.get("/api/admin/applicants", async (req, res) => {
  try {
    console.log("🔍 Fetching all applicants")
    const applicants = await Applicant.find({}).populate("userId", "name email").sort({ createdAt: -1 })
    console.log(`📋 Found ${applicants.length} applicants`)
    res.json(applicants)
  } catch (err) {
    console.error("❌ Get applicants error:", err)
    res.status(500).json({ error: "Failed to fetch applicants" })
  }
})

// Admin endpoint to view resume
app.get("/api/admin/resume/:applicantId", async (req, res) => {
  try {
    const { applicantId } = req.params
    console.log(`📄 Fetching resume for applicant: ${applicantId}`)

    const applicant = await Applicant.findById(applicantId)
    if (!applicant || !applicant.resumeUrl) {
      return res.status(404).json({ error: "Resume not found" })
    }

    const resumePath = path.join(__dirname, applicant.resumeUrl)
    if (!fs.existsSync(resumePath)) {
      return res.status(404).json({ error: "Resume file not found on server" })
    }

    res.json({
      resumeUrl: applicant.resumeUrl,
      fileName: applicant.resumeFileName,
      downloadUrl: `http://localhost:5000${applicant.resumeUrl}`,
    })
  } catch (err) {
    console.error("❌ Get resume error:", err)
    res.status(500).json({ error: "Failed to fetch resume" })
  }
})

// Admin endpoint to approve applicant
app.post("/api/admin/approve-applicant", async (req, res) => {
  try {
    const { applicantId, email, name } = req.body
    console.log(`✅ Approving applicant: ${email}`)

    // Generate interview code
    const interviewCode = generateInterviewCode()
    const interviewCodeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

    // Update applicant status
    await Applicant.findByIdAndUpdate(applicantId, {
      status: "approved",
      interviewCode,
      interviewCodeExpiry,
      updatedAt: new Date(),
    })

    // Send approval email with interview code
    const approvalHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Congratulations! You've Been Approved for Interview</h2>
        <p>Dear ${name},</p>
        <p>Great news! Your application has been reviewed and approved. You are now eligible to take the AI interview.</p>
        
        <div style="background-color: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #065f46; margin-top: 0;">Your Interview Code</h3>
          <div style="font-size: 24px; font-weight: bold; color: #059669; letter-spacing: 3px; font-family: monospace;">
            ${interviewCode}
          </div>
          <p style="color: #047857; margin-bottom: 0;">Use this code to access your interview</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Interview Process:</h3>
          <ol style="color: #4b5563;">
            <li><strong>Aptitude Round:</strong> 10 questions - 15 minutes</li>
            <li><strong>Coding Round:</strong> 3 problems - 45 minutes</li>
            <li><strong>HR Round:</strong> 5 questions - 20 minutes</li>
          </ol>
          <p style="color: #dc2626;"><strong>Total Duration:</strong> 80 minutes</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Next Steps:</h3>
          <ol style="color: #4b5563;">
            <li>Log in to your client dashboard</li>
            <li>Click on "Enter Interview Code"</li>
            <li>Enter the code: <strong>${interviewCode}</strong></li>
            <li>Complete all three rounds of the interview</li>
          </ol>
        </div>
        
        <p style="color: #dc2626;"><strong>Important:</strong> This code will expire in 7 days. Please complete your interview before then.</p>
        
        <p>Good luck with your interview!</p>
        <p>Best regards,<br>The Recruitment Team</p>
      </div>
    `

    await sendEmail(email, "Interview Approved - Your Interview Code Inside", approvalHtml)

    res.json({ success: true, message: "Applicant approved and interview code sent" })
  } catch (err) {
    console.error("❌ Approve applicant error:", err)
    res.status(500).json({ error: "Failed to approve applicant" })
  }
})

// Admin endpoint to reject applicant
app.post("/api/admin/reject-applicant", async (req, res) => {
  try {
    const { applicantId, email } = req.body
    console.log(`❌ Rejecting applicant: ${email}`)

    // Update applicant status
    const applicant = await Applicant.findByIdAndUpdate(applicantId, {
      status: "rejected",
      updatedAt: new Date(),
    })

    // Send rejection email
    const rejectionHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Application Update</h2>
        <p>Dear ${applicant.name},</p>
        <p>Thank you for your interest in our position and for taking the time to submit your application.</p>
        <p>After careful consideration, we have decided not to move forward with your application at this time. This decision was not easy, as we received many qualified applications.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #4b5563; margin: 0;">We encourage you to apply for future opportunities that match your skills and experience. We will keep your information on file for consideration for other suitable positions.</p>
        </div>
        <p>We appreciate your interest in our company and wish you the best in your job search.</p>
        <p>Best regards,<br>The Recruitment Team</p>
      </div>
    `

    await sendEmail(email, "Application Status Update", rejectionHtml)

    res.json({ success: true, message: "Applicant rejected and notification sent" })
  } catch (err) {
    console.error("❌ Reject applicant error:", err)
    res.status(500).json({ error: "Failed to reject applicant" })
  }
})

// Endpoint to verify interview code
app.post("/api/client/verify-interview-code", async (req, res) => {
  try {
    const { email, code } = req.body
    console.log(`🔍 Verifying interview code for: ${email}`)

    const applicant = await Applicant.findOne({
      email: email.toLowerCase().trim(),
      interviewCode: code.toUpperCase().trim(),
      status: "approved",
      interviewCodeExpiry: { $gt: new Date() },
    })

    if (!applicant) {
      console.log(`❌ Invalid or expired code for: ${email}`)
      return res.status(400).json({
        success: false,
        error: "Invalid or expired interview code",
      })
    }

    console.log(`✅ Valid interview code for: ${email}`)
    res.json({
      success: true,
      interviewData: {
        name: applicant.name,
        role: applicant.role,
        applicantId: applicant._id,
      },
    })
  } catch (err) {
    console.error("❌ Verify code error:", err)
    res.status(500).json({ error: "Failed to verify interview code" })
  }
})

// Endpoint to submit interview results
app.post("/api/client/submit-interview", async (req, res) => {
  try {
    const { email, interviewResults } = req.body
    console.log(`📝 Submitting interview results for: ${email}`)

    const applicant = await Applicant.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        status: "interview_completed",
        interviewResults: {
          ...interviewResults,
          completedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!applicant) {
      return res.status(404).json({ error: "Applicant not found" })
    }

    console.log(`✅ Interview results saved for: ${email}`)
    res.json({ success: true, message: "Interview results submitted successfully" })
  } catch (err) {
    console.error("❌ Submit interview error:", err)
    res.status(500).json({ error: "Failed to submit interview results" })
  }
})

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir))

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err)

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB." })
    }
  }

  res.status(500).json({ error: "Internal server error" })
})

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`)
  res.status(404).json({ error: "Route not found" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})
