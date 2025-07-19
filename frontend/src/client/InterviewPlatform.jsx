"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { initializeWebcam, stopWebcam, formatTime, testCamera } from "./utils"

// Role-based interview questions
const ROLE_BASED_QUESTIONS = {
  "Frontend Developer": {
    aptitude: [
      {
        id: 1,
        question: "What is the time complexity of accessing an element in an array by index?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        correct: "O(1)",
      },
      {
        id: 2,
        question: "Which CSS property is used to create flexible layouts?",
        options: ["display: block", "display: flex", "display: inline", "display: table"],
        correct: "display: flex",
      },
      {
        id: 3,
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
        id: 4,
        question: "Which JavaScript method is used to add an element to the end of an array?",
        options: ["push()", "pop()", "shift()", "unshift()"],
        correct: "push()",
      },
      {
        id: 5,
        question: "What is the default value of the position property in CSS?",
        options: ["relative", "absolute", "static", "fixed"],
        correct: "static",
      },
    ],
    coding: [
      {
        id: 1,
        title: "React Component State",
        difficulty: "Medium",
        description: "Create a React component that manages a counter with increment and decrement buttons.",
        example: "Component should display current count and have + and - buttons",
        template: `function Counter() {
  // Your code here
  
}`,
      },
      {
        id: 2,
        title: "CSS Flexbox Layout",
        difficulty: "Easy",
        description: "Write CSS to create a responsive navigation bar using flexbox.",
        example: "Navigation should be horizontal on desktop, vertical on mobile",
        template: `.navbar {
  /* Your CSS here */
  
}`,
      },
      {
        id: 3,
        title: "JavaScript Event Handling",
        difficulty: "Medium",
        description: "Implement a function that handles form validation for email and password fields.",
        example: "Email must be valid format, password must be at least 8 characters",
        template: `function validateForm(email, password) {
  // Your code here
  
}`,
      },
    ],
    hr: [
      "How do you stay updated with the latest frontend technologies and trends?",
      "Describe a challenging UI/UX problem you solved and your approach.",
      "How do you ensure cross-browser compatibility in your applications?",
      "What's your experience with responsive design and mobile-first development?",
      "How do you optimize frontend performance and loading times?",
    ],
  },
  "Backend Developer": {
    aptitude: [
      {
        id: 1,
        question: "What is the time complexity of searching in a balanced binary search tree?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: "O(log n)",
      },
      {
        id: 2,
        question: "Which HTTP status code indicates a successful POST request that created a resource?",
        options: ["200", "201", "204", "301"],
        correct: "201",
      },
      {
        id: 3,
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
        id: 4,
        question: "Which design pattern is commonly used for database connections?",
        options: ["Singleton", "Factory", "Observer", "Strategy"],
        correct: "Singleton",
      },
      {
        id: 5,
        question: "What is the purpose of indexing in databases?",
        options: ["Data encryption", "Faster query performance", "Data compression", "Backup creation"],
        correct: "Faster query performance",
      },
    ],
    coding: [
      {
        id: 1,
        title: "API Endpoint Design",
        difficulty: "Medium",
        description: "Design a RESTful API endpoint for user management with proper HTTP methods.",
        example: "Include GET, POST, PUT, DELETE operations for users",
        template: `// Express.js routes
app.get('/api/users', (req, res) => {
  // Your code here
});

// Add other routes...`,
      },
      {
        id: 2,
        title: "Database Query Optimization",
        difficulty: "Hard",
        description: "Write an optimized SQL query to find users with their order counts.",
        example: "Join users and orders tables, include users with zero orders",
        template: `SELECT 
  -- Your SQL here
FROM users u
-- Continue your query...`,
      },
      {
        id: 3,
        title: "Authentication Middleware",
        difficulty: "Medium",
        description: "Implement JWT authentication middleware for protecting routes.",
        example: "Verify token, extract user info, handle errors",
        template: `function authenticateToken(req, res, next) {
  // Your code here
  
}`,
      },
    ],
    hr: [
      "How do you handle database performance optimization in large-scale applications?",
      "Describe your experience with microservices architecture and its challenges.",
      "How do you ensure API security and prevent common vulnerabilities?",
      "What's your approach to handling high-traffic scenarios and scalability?",
      "How do you implement proper error handling and logging in backend systems?",
    ],
  },
  "General Position": {
    aptitude: [
      {
        id: 1,
        question: "If a train travels 120 km in 2 hours, what is its average speed?",
        options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
        correct: "60 km/h",
      },
      {
        id: 2,
        question: "What is 15% of 200?",
        options: ["25", "30", "35", "40"],
        correct: "30",
      },
      {
        id: 3,
        question: "What comes next in the sequence: 2, 4, 8, 16, ?",
        options: ["24", "28", "32", "36"],
        correct: "32",
      },
      {
        id: 4,
        question: "Which of the following is a programming language?",
        options: ["HTML", "CSS", "JavaScript", "SQL"],
        correct: "JavaScript",
      },
      {
        id: 5,
        question: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Processing Unit",
          "Central Program Unit",
          "Computer Program Unit",
        ],
        correct: "Central Processing Unit",
      },
    ],
    coding: [
      {
        id: 1,
        title: "Basic Algorithm",
        difficulty: "Easy",
        description: "Write a function to find the largest number in an array.",
        example: "Input: [3, 7, 2, 9, 1] Output: 9",
        template: `function findLargest(numbers) {
  // Your code here
  
}`,
      },
      {
        id: 2,
        title: "String Manipulation",
        difficulty: "Easy",
        description: "Create a function that reverses a string without using built-in reverse methods.",
        example: "Input: 'hello' Output: 'olleh'",
        template: `function reverseString(str) {
  // Your code here
  
}`,
      },
      {
        id: 3,
        title: "Basic Data Structure",
        difficulty: "Medium",
        description: "Implement a simple stack with push, pop, and peek operations.",
        example: "Support basic stack operations with proper error handling",
        template: `class Stack {
  constructor() {
    // Your code here
  }
  
  push(item) {
    // Your code here
  }
  
  pop() {
    // Your code here
  }
  
  peek() {
    // Your code here
  }
}`,
      },
    ],
    hr: [
      "Tell me about yourself and your career goals.",
      "How do you handle working under pressure and tight deadlines?",
      "Describe a time when you had to learn something new quickly.",
      "What motivates you in your work and how do you stay productive?",
      "How do you handle conflicts or disagreements with team members?",
    ],
  },
}

export default function InterviewPlatform({ user, interviewData, onComplete, onBack }) {
  // State management
  const [currentRound, setCurrentRound] = useState("aptitude")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes for aptitude
  const [answers, setAnswers] = useState({
    aptitude: [],
    coding: [],
    hr: [],
  })
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [faceDetectionActive, setFaceDetectionActive] = useState(false)
  const [violations, setViolations] = useState([])
  const [showViolationAlert, setShowViolationAlert] = useState(false)
  const [currentViolation, setCurrentViolation] = useState("")
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [cameraTestResult, setCameraTestResult] = useState(null)
  const [isTestingCamera, setIsTestingCamera] = useState(false)
  const [uniqueQuestions, setUniqueQuestions] = useState(null)
  const [questionsLoading, setQuestionsLoading] = useState(true)

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const timerRef = useRef(null)
  const detectionIntervalRef = useRef(null)

  // Get questions based on role
  const role = interviewData?.role || user?.role || "General Position"
  const questions = ROLE_BASED_QUESTIONS[role] || ROLE_BASED_QUESTIONS["General Position"]

  // Round configurations
  const roundConfig = {
    aptitude: { duration: 900, title: "Aptitude Round", questions: uniqueQuestions || questions.aptitude },
    coding: { duration: 2700, title: "Coding Round", questions: questions.coding },
    hr: { duration: 1200, title: "HR Round", questions: questions.hr },
  }

  const currentRoundData = roundConfig[currentRound]
  const currentQuestion = currentRoundData.questions[currentQuestionIndex]

  // Fetch unique questions for the user
  useEffect(() => {
    const fetchUniqueQuestions = async () => {
      try {
        setQuestionsLoading(true)
        console.log("🔍 Fetching unique questions for:", user.email, role)

        const response = await axios.get("http://localhost:5000/api/client/interview-questions", {
          params: {
            email: user.email,
            role: role,
          },
        })

        console.log("✅ Received unique questions:", response.data)
        setUniqueQuestions(response.data.questions)
      } catch (error) {
        console.error("❌ Failed to fetch unique questions:", error)
        // Fallback to default questions if API fails
        setUniqueQuestions(questions.aptitude)
      } finally {
        setQuestionsLoading(false)
      }
    }

    if (user?.email) {
      fetchUniqueQuestions()
    }
  }, [user.email, role])

  // Test camera functionality
  const handleTestCamera = async () => {
    setIsTestingCamera(true)
    const result = await testCamera()
    setCameraTestResult(result)
    setIsTestingCamera(false)
  }

  // Initialize webcam when interview starts
  const startInterview = async () => {
    console.log("🚀 Starting interview...")
    setShowInstructions(false)
    setIsInterviewStarted(true)

    // Initialize webcam with enhanced monitoring
    const stream = await initializeWebcam(
      videoRef,
      canvasRef,
      detectionIntervalRef,
      setViolations,
      setShowViolationAlert,
      setCurrentViolation,
      setIsWebcamActive,
      setFaceDetectionActive,
    )

    if (stream) {
      // Start timer
      startTimer()
    } else {
      alert("Camera access is required to proceed with the interview. Please refresh and allow camera access.")
      return
    }
  }

  // Timer management
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Handle time up
  const handleTimeUp = () => {
    console.log(`⏰ Time up for ${currentRound} round`)
    stopTimer()

    // Auto-submit current round and move to next
    if (currentRound === "aptitude") {
      moveToNextRound("coding")
    } else if (currentRound === "coding") {
      moveToNextRound("hr")
    } else {
      completeInterview()
    }
  }

  // Move to next round
  const moveToNextRound = (nextRound) => {
    console.log(`➡️ Moving to ${nextRound} round`)
    setCurrentRound(nextRound)
    setCurrentQuestionIndex(0)
    setTimeLeft(roundConfig[nextRound].duration)
    startTimer()
  }

  // Handle answer selection (aptitude)
  const handleAnswerSelect = (selectedAnswer) => {
    const newAnswers = [...answers.aptitude]
    newAnswers[currentQuestionIndex] = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selectedAnswer,
      correctAnswer: currentQuestion.correct,
      isCorrect: selectedAnswer === currentQuestion.correct,
    }
    setAnswers({ ...answers, aptitude: newAnswers })
  }

  // Handle coding answer
  const handleCodingAnswer = (solution) => {
    const newAnswers = [...answers.coding]
    newAnswers[currentQuestionIndex] = {
      questionId: currentQuestion.id,
      question: currentQuestion.title,
      solution,
      score: Math.min(10, Math.floor(solution.length / 50)), // Simple scoring based on length
    }
    setAnswers({ ...answers, coding: newAnswers })
  }

  // Handle HR answer
  const handleHRAnswer = (answer) => {
    const newAnswers = [...answers.hr]
    newAnswers[currentQuestionIndex] = {
      question: currentQuestion,
      answer,
      score: Math.min(10, Math.floor(answer.length / 100)), // Simple scoring based on length
    }
    setAnswers({ ...answers, hr: newAnswers })
  }

  // Navigate questions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < currentRoundData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Round completed
      if (currentRound === "aptitude") {
        moveToNextRound("coding")
      } else if (currentRound === "coding") {
        moveToNextRound("hr")
      } else {
        completeInterview()
      }
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  // Complete interview
  const completeInterview = async () => {
    console.log("🏁 Completing interview...")
    stopTimer()
    stopWebcam(detectionIntervalRef)

    // Calculate scores
    const aptitudeScore = answers.aptitude.reduce((score, answer) => score + (answer.isCorrect ? 10 : 0), 0)
    const codingScore = answers.coding.reduce((sum, answer) => sum + (answer.score || 0), 0)
    const hrScore = answers.hr.reduce((sum, answer) => sum + (answer.score || 0), 0)
    const totalScore = aptitudeScore + codingScore + hrScore

    const interviewResults = {
      aptitudeScore,
      codingScore,
      hrScore,
      totalScore,
      aptitudeAnswers: answers.aptitude,
      codingAnswers: answers.coding,
      hrAnswers: answers.hr,
      violations,
      role: role,
    }

    console.log("📊 Interview results:", interviewResults)

    try {
      // Submit results to backend
      await axios.post("http://localhost:5000/api/client/submit-interview", {
        email: user.email,
        interviewResults,
      })

      onComplete(interviewResults)
    } catch (error) {
      console.error("❌ Failed to submit interview results:", error)
      alert("Failed to submit interview results. Please contact support.")
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      stopWebcam(detectionIntervalRef)
    }
  }, [])

  // Show loading while questions are being fetched
  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Generating your unique interview questions...</span>
          </div>
        </div>
      </div>
    )
  }

  // Instructions screen
  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Interview Platform</h1>
              <p className="text-lg text-gray-600">Welcome, {interviewData?.name || user?.name}</p>
              <p className="text-md text-blue-600 font-medium">Role: {role}</p>
            </div>

            {/* Camera Test Section */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">📹</span>
                Camera Test Required
              </h3>
              <p className="text-yellow-700 mb-4">
                Please test your camera before starting the interview. Camera monitoring is required throughout the
                interview for security and proctoring purposes.
              </p>

              <button
                onClick={handleTestCamera}
                disabled={isTestingCamera}
                className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 mb-4 font-medium transition-colors"
              >
                {isTestingCamera ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Testing Camera...
                  </span>
                ) : (
                  "Test Camera"
                )}
              </button>

              {cameraTestResult && (
                <div
                  className={`p-4 rounded-lg border-2 ${
                    cameraTestResult.success
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <p className="font-bold flex items-center mb-2">
                    {cameraTestResult.success ? (
                      <>
                        <span className="text-green-600 mr-2">✅</span>
                        Camera Test Successful
                      </>
                    ) : (
                      <>
                        <span className="text-red-600 mr-2">❌</span>
                        Camera Test Failed
                      </>
                    )}
                  </p>
                  <p className="text-sm mb-2">{cameraTestResult.message}</p>
                  {cameraTestResult.details && (
                    <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                      <p>Resolution: {cameraTestResult.details.resolution}</p>
                      <p>Frame Rate: {cameraTestResult.details.frameRate} FPS</p>
                    </div>
                  )}
                  {!cameraTestResult.success && cameraTestResult.solutions && (
                    <div className="mt-2">
                      <p className="font-medium text-sm mb-1">Solutions:</p>
                      <ul className="text-xs space-y-1">
                        {cameraTestResult.solutions.map((solution, index) => (
                          <li key={index}>{solution}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interview Instructions */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-2xl mr-2">📋</span>
                  Interview Structure
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Aptitude Round</p>
                      <p className="text-sm text-blue-600">{uniqueQuestions?.length || 5} questions • 15 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Coding Round</p>
                      <p className="text-sm text-green-600">3 problems • 45 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-purple-800">HR Round</p>
                      <p className="text-sm text-purple-600">5 questions • 20 minutes</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-2xl mr-2">⚠️</span>
                  Critical Rules
                </h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start space-x-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500 mt-1 font-bold">•</span>
                    <span>
                      <strong>Camera must remain on</strong> throughout the interview
                    </span>
                  </li>
                  <li className="flex items-start space-x-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500 mt-1 font-bold">•</span>
                    <span>
                      <strong>No tab switching</strong> or leaving the interview window
                    </span>
                  </li>
                  <li className="flex items-start space-x-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500 mt-1 font-bold">•</span>
                    <span>
                      <strong>Ensure you are alone</strong> in the room
                    </span>
                  </li>
                  <li className="flex items-start space-x-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500 mt-1 font-bold">•</span>
                    <span>
                      <strong>Face must be clearly visible</strong> at all times
                    </span>
                  </li>
                  <li className="flex items-start space-x-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500 mt-1 font-bold">•</span>
                    <span>
                      <strong>No external help</strong> or resources allowed
                    </span>
                  </li>
                  <li className="flex items-start space-x-3 p-2 bg-red-50 rounded">
                    <span className="text-red-500 mt-1 font-bold">•</span>
                    <span>
                      <strong>Violations are recorded</strong> and affect evaluation
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">💻</span>
                Technical Requirements
              </h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-700">
                <div>
                  <p className="font-bold mb-3 text-blue-800">Required:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Working webcam (720p or higher)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Stable internet connection (5+ Mbps)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Modern browser (Chrome, Firefox, Safari)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Well-lit, quiet room
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold mb-3 text-blue-800">Recommended:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Close all other applications
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Use headphones for better audio
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Backup internet connection
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Fully charged device
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={startInterview}
                disabled={!cameraTestResult?.success}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {cameraTestResult?.success ? (
                  <span className="flex items-center">
                    <span className="text-xl mr-2">🚀</span>
                    Start Interview
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="text-xl mr-2">⚠️</span>
                    Complete Camera Test First
                  </span>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-3">
                By clicking start, you agree to the interview terms and monitoring conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main interview interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Violation Alert */}
      {showViolationAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in-right">
          <div className="bg-red-500 text-white p-4 rounded-lg shadow-2xl border-2 border-red-600">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">⚠</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">VIOLATION DETECTED!</h4>
                <p className="text-sm leading-tight">{currentViolation}</p>
                <div className="mt-2 text-xs opacity-90">
                  This violation has been recorded and may affect your evaluation.
                </div>
              </div>
              <button
                onClick={() => setShowViolationAlert(false)}
                className="flex-shrink-0 text-red-200 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{currentRoundData.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {currentRoundData.questions.length} • Role: {role}
              </p>
            </div>
            <div className="flex items-center space-x-6">
              {/* Timer */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    timeLeft > 300 ? "bg-green-500" : timeLeft > 60 ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                  }`}
                ></div>
                <span className={`font-mono text-lg font-bold ${timeLeft <= 60 ? "text-red-600" : "text-gray-700"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Camera Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${isWebcamActive ? "bg-green-500" : "bg-red-500 animate-pulse"}`}
                ></div>
                <span className="text-sm text-gray-600">{isWebcamActive ? "Camera Active" : "Camera Inactive"}</span>
              </div>

              {/* Face Detection Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${faceDetectionActive ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}
                ></div>
                <span className="text-sm text-gray-600">{faceDetectionActive ? "Face Detected" : "No Face"}</span>
              </div>

              {/* Violations Count */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${violations.length === 0 ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span className={`text-sm font-medium ${violations.length === 0 ? "text-green-600" : "text-red-600"}`}>
                  {violations.length} Violations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Aptitude Round */}
              {currentRound === "aptitude" && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">Question {currentQuestionIndex + 1}</h2>
                      <span className="text-sm text-gray-500">Multiple Choice</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / currentRoundData.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mb-6 text-gray-800 leading-relaxed">{currentQuestion.question}</h3>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                          answers.aptitude[currentQuestionIndex]?.selectedAnswer === option
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={answers.aptitude[currentQuestionIndex]?.selectedAnswer === option}
                          onChange={() => handleAnswerSelect(option)}
                          className="text-blue-600 w-4 h-4"
                        />
                        <span className="text-gray-800 font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Coding Round */}
              {currentRound === "coding" && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">{currentQuestion.title}</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          currentQuestion.difficulty === "Easy"
                            ? "bg-green-100 text-green-800"
                            : currentQuestion.difficulty === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / currentRoundData.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3">Problem Description:</h3>
                    <p className="text-gray-700 mb-4 leading-relaxed">{currentQuestion.description}</p>

                    <h4 className="font-semibold text-gray-800 mb-2">Example:</h4>
                    <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-700 font-mono">
                      {currentQuestion.example}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Your Solution:</h4>
                    <textarea
                      value={answers.coding[currentQuestionIndex]?.solution || currentQuestion.template}
                      onChange={(e) => handleCodingAnswer(e.target.value)}
                      className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Write your solution here..."
                    />
                  </div>
                </div>
              )}

              {/* HR Round */}
              {currentRound === "hr" && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">HR Question {currentQuestionIndex + 1}</h2>
                      <span className="text-sm text-gray-500">Behavioral</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / currentRoundData.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mb-6 text-gray-800 leading-relaxed">{currentQuestion}</h3>

                  <div>
                    <textarea
                      value={answers.hr[currentQuestionIndex]?.answer || ""}
                      onChange={(e) => handleHRAnswer(e.target.value)}
                      className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Please provide a detailed answer with specific examples..."
                    />
                    <div className="mt-2 text-sm text-gray-500">
                      Tip: Provide specific examples and explain your thought process
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="flex space-x-3">
                  {currentQuestionIndex < currentRoundData.questions.length - 1 ? (
                    <button
                      onClick={goToNextQuestion}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={currentRound === "hr" ? completeInterview : goToNextQuestion}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {currentRound === "hr" ? "Complete Interview" : "Next Round"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Feed */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-lg mr-2">📹</span>
                Camera Feed
              </h3>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-48 bg-gray-900 rounded-lg object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Status Overlay */}
                <div className="absolute top-2 left-2">
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                      isWebcamActive ? "bg-green-500 text-white" : "bg-red-500 text-white animate-pulse"
                    }`}
                  >
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                    <span>{isWebcamActive ? "LIVE" : "OFFLINE"}</span>
                  </div>
                </div>

                {/* Face Detection Indicator */}
                <div className="absolute top-2 right-2">
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      faceDetectionActive ? "bg-green-500 text-white" : "bg-yellow-500 text-white animate-pulse"
                    }`}
                  >
                    {faceDetectionActive ? "👤 FACE OK" : "👤 NO FACE"}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Progress Overview</h3>
              <div className="space-y-3">
                <div
                  className={`flex items-center justify-between p-2 rounded ${
                    currentRound === "aptitude" ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">Aptitude</span>
                  <span className="text-xs text-gray-600">
                    {currentRound === "aptitude"
                      ? `${currentQuestionIndex + 1}/${currentRoundData.questions.length}`
                      : answers.aptitude.length > 0
                        ? "✓ Complete"
                        : "Pending"}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between p-2 rounded ${
                    currentRound === "coding" ? "bg-green-50 border border-green-200" : "bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">Coding</span>
                  <span className="text-xs text-gray-600">
                    {currentRound === "coding"
                      ? `${currentQuestionIndex + 1}/${currentRoundData.questions.length}`
                      : answers.coding.length > 0
                        ? "✓ Complete"
                        : "Pending"}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between p-2 rounded ${
                    currentRound === "hr" ? "bg-purple-50 border border-purple-200" : "bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">HR</span>
                  <span className="text-xs text-gray-600">
                    {currentRound === "hr"
                      ? `${currentQuestionIndex + 1}/${currentRoundData.questions.length}`
                      : answers.hr.length > 0
                        ? "✓ Complete"
                        : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Violations Panel */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-lg mr-2">⚠️</span>
                Violations ({violations.length})
              </h3>
              {violations.length === 0 ? (
                <p className="text-sm text-green-600 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  No violations detected
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {violations.slice(-5).map((violation, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded border-l-2 border-red-300">
                      {violation}
                    </div>
                  ))}
                  {violations.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">... and {violations.length - 5} more violations</p>
                  )}
                </div>
              )}
            </div>

            {/* Emergency Actions */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Emergency Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={onBack}
                  className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Exit Interview
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Use only in case of technical issues</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
