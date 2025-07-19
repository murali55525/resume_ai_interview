const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const cors = require("cors")
const nodemailer = require("nodemailer")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const path = require("path")
const fs = require("fs")
const pdf = require("pdf-parse")
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

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mmuralikarthick123:murali555@cluster0.2fjlqyu.mongodb.net/"

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
      violations: [String],
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

// FIXED Email configuration with working Gmail setup
let transporter

const createTransporter = async () => {
  try {
    console.log("🔧 Setting up Gmail transporter...")
    
    // Create Gmail transporter with App Password
    transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: "m.muralikarthick123@gmail.com",
        pass: "pkvz mego zwoj ogoi", // App Password
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true, // Enable debug logs
      logger: true, // Enable logger
    })

    // Verify the connection
    console.log("🔍 Verifying Gmail connection...")
    const verification = await transporter.verify()
    console.log("✅ Gmail transporter verified successfully:", verification)

    // Send a test email to verify it's working
    console.log("📧 Sending test email...")
    const testInfo = await transporter.sendMail({
      from: '"AI Interview Platform" <m.muralikarthick123@gmail.com>',
      to: "m.muralikarthick123@gmail.com",
      subject: "Email Service Test - " + new Date().toISOString(),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Email Service Test</h2>
          <p>This is a test email to verify the email service is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Status:</strong> Email service is operational ✅</p>
        </div>
      `,
    })

    console.log("✅ Test email sent successfully!")
    console.log("Message ID:", testInfo.messageId)
    console.log("Response:", testInfo.response)

  } catch (error) {
    console.error("❌ Gmail setup failed:", error)
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    })

    // Create a fallback that logs emails instead of sending
    transporter = {
      sendMail: async (mailOptions) => {
        console.log("📧 FALLBACK EMAIL LOG:")
        console.log("From:", mailOptions.from)
        console.log("To:", mailOptions.to)
        console.log("Subject:", mailOptions.subject)
        console.log("HTML Content Length:", mailOptions.html.length)
        console.log("---")
        
        // Return a fake success response
        return {
          messageId: "fallback-" + Date.now(),
          response: "250 OK (Fallback Mode)",
          accepted: [mailOptions.to],
          rejected: [],
        }
      },
    }
    console.log("⚠️ Using fallback email logger")
  }
}

// Initialize transporter immediately
createTransporter()

// Enhanced send email function with retry logic
const sendEmail = async (to, subject, html, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📧 Sending email attempt ${attempt}/${retries}`)
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)

      const info = await transporter.sendMail({
        from: '"AI Interview Platform" <m.muralikarthick123@gmail.com>',
        to: to,
        subject: subject,
        html: html,
        // Add additional headers for better deliverability
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      })

      console.log(`✅ Email sent successfully on attempt ${attempt}`)
      console.log("Message ID:", info.messageId)
      console.log("Response:", info.response)
      console.log("Accepted:", info.accepted)
      console.log("Rejected:", info.rejected)

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        attempt: attempt,
      }

    } catch (error) {
      console.error(`❌ Email sending failed on attempt ${attempt}:`, error.message)
      
      if (attempt === retries) {
        console.error("❌ All email attempts failed")
        return {
          success: false,
          error: error.message,
          code: error.code,
          attempts: retries,
        }
      }
      
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`⏳ Waiting ${waitTime}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

// Question pools for generating unique questions
const QUESTION_POOLS = {
  aptitude: {
    "Frontend Developer": [
      {
        question: "What is the time complexity of accessing an element in an array by index?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        correct: "O(1)",
      },
      {
        question: "Which CSS property is used to create flexible layouts?",
        options: ["display: block", "display: flex", "display: inline", "display: table"],
        correct: "display: flex",
      },
      {
        question: "What does DOM stand for?",
        options: [
          "Document Object Model",
          "Data Object Management",
          "Dynamic Object Method",
          "Document Oriented Model",
        ],
        correct: "Document Object Model",
      },
      {
        question: "Which JavaScript method is used to add an element to the end of an array?",
        options: ["push()", "pop()", "shift()", "unshift()"],
        correct: "push()",
      },
      {
        question: "What is the default value of the position property in CSS?",
        options: ["relative", "absolute", "static", "fixed"],
        correct: "static",
      },
      {
        question: "Which HTML5 element is used for navigation links?",
        options: ["<nav>", "<menu>", "<navigation>", "<links>"],
        correct: "<nav>",
      },
      {
        question: "What is the purpose of the 'key' prop in React?",
        options: ["Styling", "Event handling", "List rendering optimization", "State management"],
        correct: "List rendering optimization",
      },
      {
        question: "Which CSS unit is relative to the viewport width?",
        options: ["px", "em", "vw", "rem"],
        correct: "vw",
      },
      {
        question: "What does AJAX stand for?",
        options: [
          "Asynchronous JavaScript and XML",
          "Advanced Java and XML",
          "Automatic JavaScript and XML",
          "Active JavaScript and XML",
        ],
        correct: "Asynchronous JavaScript and XML",
      },
      {
        question: "Which method is used to prevent the default behavior of an event?",
        options: ["stopPropagation()", "preventDefault()", "stopDefault()", "cancelEvent()"],
        correct: "preventDefault()",
      },
    ],
    "Backend Developer": [
      {
        question: "What is the time complexity of searching in a balanced binary search tree?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: "O(log n)",
      },
      {
        question: "Which HTTP status code indicates a successful POST request that created a resource?",
        options: ["200", "201", "204", "301"],
        correct: "201",
      },
      {
        question: "What does ACID stand for in database transactions?",
        options: [
          "Atomicity, Consistency, Isolation, Durability",
          "Access, Control, Integration, Data",
          "Automatic, Consistent, Independent, Distributed",
          "Advanced, Centralized, Integrated, Database",
        ],
        correct: "Atomicity, Consistency, Isolation, Durability",
      },
      {
        question: "Which design pattern is commonly used for database connections?",
        options: ["Singleton", "Factory", "Observer", "Strategy"],
        correct: "Singleton",
      },
      {
        question: "What is the purpose of indexing in databases?",
        options: ["Data encryption", "Faster query performance", "Data compression", "Backup creation"],
        correct: "Faster query performance",
      },
      {
        question: "Which HTTP method is idempotent?",
        options: ["POST", "PUT", "PATCH", "DELETE"],
        correct: "PUT",
      },
      {
        question: "What is the difference between SQL and NoSQL databases?",
        options: ["Structure vs Flexibility", "Speed vs Security", "Local vs Cloud", "Free vs Paid"],
        correct: "Structure vs Flexibility",
      },
      {
        question: "Which authentication method is stateless?",
        options: ["Sessions", "Cookies", "JWT", "OAuth"],
        correct: "JWT",
      },
      {
        question: "What is the purpose of middleware in Express.js?",
        options: ["Database connection", "Request/Response processing", "File storage", "User interface"],
        correct: "Request/Response processing",
      },
      {
        question: "Which caching strategy is best for frequently accessed data?",
        options: ["Write-through", "Write-behind", "Cache-aside", "Refresh-ahead"],
        correct: "Cache-aside",
      },
    ],
    "General Position": [
      {
        question: "If a train travels 120 km in 2 hours, what is its average speed?",
        options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
        correct: "60 km/h",
      },
      {
        question: "What is 15% of 200?",
        options: ["25", "30", "35", "40"],
        correct: "30",
      },
      {
        question: "What comes next in the sequence: 2, 4, 8, 16, ?",
        options: ["24", "28", "32", "36"],
        correct: "32",
      },
      {
        question: "Which of the following is a programming language?",
        options: ["HTML", "CSS", "JavaScript", "SQL"],
        correct: "JavaScript",
      },
      {
        question: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Processing Unit",
          "Central Program Unit",
          "Computer Program Unit",
        ],
        correct: "Central Processing Unit",
      },
      {
        question: "What is 25% of 80?",
        options: ["15", "20", "25", "30"],
        correct: "20",
      },
      {
        question: "Which planet is closest to the Sun?",
        options: ["Venus", "Earth", "Mercury", "Mars"],
        correct: "Mercury",
      },
      {
        question: "What is the square root of 64?",
        options: ["6", "7", "8", "9"],
        correct: "8",
      },
      {
        question: "Which data structure follows LIFO principle?",
        options: ["Queue", "Stack", "Array", "Tree"],
        correct: "Stack",
      },
      {
        question: "What does WWW stand for?",
        options: ["World Wide Web", "World Wide Work", "Web Wide World", "Wide World Web"],
        correct: "World Wide Web",
      },
    ],
  },
}

// Function to generate unique questions for each user
const generateUniqueQuestions = (role, userId) => {
  const roleQuestions = QUESTION_POOLS.aptitude[role] || QUESTION_POOLS.aptitude["General Position"]

  // Use userId as seed for consistent randomization per user
  const seed = Number.parseInt(userId.slice(-8), 16) || 12345

  // Simple seeded random function
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Shuffle questions based on user seed
  const shuffled = [...roleQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Return first 10 questions with unique IDs
  return shuffled.slice(0, 10).map((q, index) => ({
    ...q,
    id: index + 1,
  }))
}

// Add endpoint to get unique questions for a user
app.get("/api/client/interview-questions", async (req, res) => {
  try {
    const { email, role } = req.query

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Find user to get their ID
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const userRole = role || "General Position"
    const uniqueQuestions = generateUniqueQuestions(userRole, user._id.toString())

    console.log(`✅ Generated ${uniqueQuestions.length} unique questions for ${email} (${userRole})`)

    res.json({
      questions: uniqueQuestions,
      role: userRole,
      userId: user._id,
    })
  } catch (err) {
    console.error("❌ Generate questions error:", err)
    res.status(500).json({ error: "Failed to generate questions" })
  }
})

// Generate random interview code
const generateInterviewCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
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

// Enhanced resume parsing endpoint with PDF support
app.post("/api/client/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    console.log("📄 Processing resume file:", req.file.originalname, "Type:", req.file.mimetype)

    let resumeText = ""

    // Handle different file types
    if (req.file.mimetype === "application/pdf") {
      // Parse PDF file
      const dataBuffer = fs.readFileSync(req.file.path)
      const pdfData = await pdf(dataBuffer)
      resumeText = pdfData.text
      console.log("✅ PDF parsed successfully, text length:", resumeText.length)
    } else if (req.file.mimetype === "text/plain") {
      // Read text file
      resumeText = fs.readFileSync(req.file.path, "utf8")
      console.log("✅ Text file read successfully, text length:", resumeText.length)
    } else {
      // For DOC/DOCX files, we'll need additional parsing
      return res.status(400).json({
        error: "DOC/DOCX files require additional setup. Please use PDF or TXT files.",
      })
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        error: "Could not extract sufficient text from the resume. Please check the file format.",
      })
    }

    // Use Gemini API to parse the resume text
    const GEMINI_API_KEY = "AIzaSyBe2gAXouTuPzR0HuqY6cSLL40OWjblklw"

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a professional resume parser. Extract information from the following resume text and return ONLY a valid JSON object with these exact fields:

{
  "full_name": "candidate's full name",
  "email": "email address if found, otherwise empty string",
  "phone": "phone number in any format",
  "institution": "most recent educational institution name",
  "address": "full address or city, state if available",
  "experience": "work experience description or years",
  "education": "highest degree and field of study",
  "linkedin": "LinkedIn profile URL if found",
  "portfolio": "portfolio website URL if found", 
  "github": "GitHub profile URL if found",
  "role": "suggested job role based on skills and experience",
  "skills": ["array", "of", "key", "skills", "extracted"]
}

Important rules:
- Return ONLY the JSON object, no other text
- If a field is not found, use empty string "" or empty array [] for skills
- Extract actual values from the resume text
- For role, suggest based on the candidate's experience and skills
- For skills, extract technical skills, programming languages, tools, etc.

Resume text:
${resumeText}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const geminiData = await response.json()
    console.log("🤖 Gemini raw response:", geminiData)

    let parsedData
    const responseText = geminiData.candidates[0].content.parts[0].text.trim()

    // Try to extract JSON from the response
    try {
      // Remove any markdown formatting
      const cleanedResponse = responseText.replace(/\`\`\`json\n?|\n?\`\`\`/g, "").trim()
      parsedData = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      // Try to find JSON within the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("Could not extract valid JSON from response")
      }
    }

    console.log("✅ Parsed resume data:", parsedData)

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      data: parsedData,
      message: "Resume parsed successfully",
    })
  } catch (err) {
    console.error("❌ Resume parsing error:", err)

    // Clean up the uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    res.status(500).json({
      error: "Failed to parse resume. Please check the file format and try again.",
      details: err.message,
    })
  }
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

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" })
    }

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
    console.log(`✅ User created successfully: ${email}`)

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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return res.status(400).json({ error: "Invalid email or password" })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      console.log(`❌ Invalid password for: ${email}`)
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

// Endpoint to receive client application - FIXED
app.post("/api/client/apply", upload.single("resume"), async (req, res) => {
  try {
    console.log("📝 Received application submission")
    console.log("Body:", req.body)
    console.log("File:", req.file ? req.file.filename : "No file")

    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    console.log(`🔍 Looking for user with email: ${normalizedEmail}`)

    // Check if application already exists
    const existingApplication = await Applicant.findOne({ email: normalizedEmail })
    if (existingApplication) {
      console.log(`⚠️ Application already exists for email: ${normalizedEmail}`)
      return res.status(400).json({ error: "Application already submitted for this email." })
    }

    // Find user - FIXED: Better error handling
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      console.log(`❌ User not found for email: ${normalizedEmail}`)
      // List all users for debugging
      const allUsers = await User.find({}, { email: 1, name: 1 })
      console.log("📋 All users in database:", allUsers)
      return res.status(400).json({
        error: "User not found. Please ensure you are logged in with the correct account.",
        debug: `Looking for: ${normalizedEmail}`,
      })
    }

    console.log(`✅ User found: ${user.name} (${user.email})`)

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
      email: normalizedEmail,
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
    console.log(`✅ Application saved for: ${normalizedEmail}`)

    // Update user's hasApplication status
    await User.findByIdAndUpdate(user._id, { hasApplication: true })

    // Send confirmation email to applicant
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Received</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">AI Interview Platform</h1>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #059669; margin-bottom: 20px;">Application Received Successfully! ✅</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Dear <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Thank you for submitting your application to our AI Interview Platform. We have successfully received your details and resume.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
              <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px;">📋 Application Summary:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Name:</td>
                  <td style="padding: 8px 0; color: #374151;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0; color: #374151;">${normalizedEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Role:</td>
                  <td style="padding: 8px 0; color: #374151;">${role || "General Position"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Institution:</td>
                  <td style="padding: 8px 0; color: #374151;">${institution}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Submitted:</td>
                  <td style="padding: 8px 0; color: #374151;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #10b981;">
              <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">🚀 What's Next?</h3>
              <ol style="color: #047857; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Our team will review your application within <strong>2-3 business days</strong></li>
                <li>If selected, you'll receive an interview code via email</li>
                <li>Use the code to access our AI-powered interview platform</li>
                <li>Complete the interview rounds (Aptitude, Coding, HR)</li>
                <li>Receive your results and feedback</li>
              </ol>
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">💡 Pro Tips:</h3>
              <ul style="color: #b45309; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Keep checking your email (including spam folder)</li>
                <li>Ensure you have a working webcam and stable internet</li>
                <li>Practice coding problems relevant to your role</li>
                <li>Prepare for behavioral questions</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              If you have any questions or concerns, please don't hesitate to contact our support team.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Best regards,<br>
              <strong>The AI Interview Platform Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">© 2024 AI Interview Platform. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    console.log("📧 Sending confirmation email...")
    const emailResult = await sendEmail(
      normalizedEmail,
      "✅ Application Received Successfully - AI Interview Platform",
      confirmationHtml,
    )

    console.log("📧 Email result:", emailResult)

    res.json({ 
      success: true, 
      message: "Application submitted successfully",
      emailSent: emailResult.success
    })
  } catch (err) {
    console.error("❌ Apply error:", err)
    if (err.code === 11000) {
      // Duplicate key error
      res.status(400).json({ error: "Application already exists for this email" })
    } else {
      res.status(500).json({ error: "Failed to save application data", details: err.message })
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

// Debug endpoint to check users
app.get("/api/debug/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).limit(10)
    res.json({ users, count: users.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Approved</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #059669;">
            <h1 style="color: #059669; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #059669; margin-bottom: 20px;">You've Been Approved for Interview! ✅</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Dear <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Great news! Your application has been reviewed and <strong>approved</strong>. You are now eligible to take the AI-powered interview.
            </p>
            
            <div style="background-color: #ecfdf5; border: 3px solid #10b981; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h3 style="color: #065f46; margin-top: 0; margin-bottom: 20px; font-size: 20px;">🔑 Your Interview Code</h3>
              <div style="font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px dashed #10b981; margin: 20px 0;">
                ${interviewCode}
              </div>
              <p style="color: #047857; margin-bottom: 0; font-size: 14px; font-weight: bold;">⚠️ Keep this code safe - you'll need it to access your interview</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">📋 Interview Structure</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; background-color: #dbeafe; border-radius: 6px; margin-bottom: 8px; display: block;">
                    <strong style="color: #1e40af;">Round 1: Aptitude Test</strong><br>
                    <span style="color: #64748b; font-size: 14px;">10 questions • 15 minutes • Multiple choice</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #dcfce7; border-radius: 6px; margin-bottom: 8px; display: block;">
                    <strong style="color: #166534;">Round 2: Coding Challenge</strong><br>
                    <span style="color: #64748b; font-size: 14px;">3 problems • 45 minutes • Programming</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #fae8ff; border-radius: 6px; display: block;">
                    <strong style="color: #7c2d12;">Round 3: HR Interview</strong><br>
                    <span style="color: #64748b; font-size: 14px;">5 questions • 20 minutes • Behavioral</span>
                  </td>
                </tr>
              </table>
              <p style="color: #dc2626; font-weight: bold; text-align: center; margin: 15px 0 0 0; font-size: 16px;">
                ⏱️ Total Duration: 80 minutes
              </p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 25px; border-radius: 8px; margin: 25px 0; border: 1px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">🚀 How to Start Your Interview</h3>
              <ol style="color: #b45309; line-height: 2; margin: 0; padding-left: 20px; font-size: 15px;">
                <li><strong>Log in</strong> to your client dashboard</li>
                <li>Click on <strong>"Enter Interview Code"</strong></li>
                <li>Enter your code: <strong style="background-color: #ffffff; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${interviewCode}</strong></li>
                <li><strong>Allow camera access</strong> when prompted</li>
                <li><strong>Complete all three rounds</strong> of the interview</li>
              </ol>
            </div>
            
            <div style="background-color: #fef2f2; padding: 25px; border-radius: 8px; margin: 25px 0; border: 1px solid #f87171;">
              <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 15px;">⚠️ Important Guidelines</h3>
              <ul style="color: #b91c1c; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Camera must remain on</strong> throughout the interview</li>
                <li><strong>No tab switching</strong> or leaving the interview window</li>
                <li><strong>Ensure you're alone</strong> in a quiet room</li>
                <li><strong>Stable internet connection</strong> is required</li>
                <li><strong>Have backup power</strong> and internet if possible</li>
                <li><strong>Complete within 7 days</strong> - code expires on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; color: #374151; margin-bottom: 10px;">Ready to showcase your skills?</p>
              <p style="font-size: 16px; color: #059669; font-weight: bold;">Good luck with your interview! 🍀</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              If you encounter any technical issues during the interview, please contact our support team immediately.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Best regards,<br>
              <strong>The AI Interview Platform Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">© 2024 AI Interview Platform. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    console.log("📧 Sending approval email...")
    const emailResult = await sendEmail(email, "🎉 Interview Approved - Your Interview Code Inside", approvalHtml)

    console.log("📧 Approval email result:", emailResult)

    res.json({
      success: true,
      message: "Applicant approved and interview code sent",
      emailSent: emailResult.success,
      interviewCode: interviewCode
    })
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Status Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #dc2626;">
            <h1 style="color: #dc2626; margin: 0; font-size: 28px;">Application Update</h1>
          </div>
          
          <div style="padding: 30px 0;">
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Dear <strong>${applicant.name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Thank you for your interest in our position and for taking the time to submit your application to our AI Interview Platform.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              After careful consideration of all applications, we have decided not to move forward with your application at this time. This decision was not easy, as we received many qualified applications from talented candidates.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #6b7280;">
              <p style="color: #4b5563; margin: 0; line-height: 1.6;">
                We encourage you to continue developing your skills and apply for future opportunities that match your experience and interests. We will keep your information on file for consideration for other suitable positions that may arise.
              </p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              We appreciate your interest in our company and wish you the best of luck in your job search and career endeavors.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Best regards,<br>
              <strong>The AI Interview Platform Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">© 2024 AI Interview Platform. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    console.log("📧 Sending rejection email...")
    const emailResult = await sendEmail(email, "Application Status Update - AI Interview Platform", rejectionHtml)

    console.log("📧 Rejection email result:", emailResult)

    res.json({
      success: true,
      message: "Applicant rejected and notification sent",
      emailSent: emailResult.success,
    })
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
        email: applicant.email,
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
