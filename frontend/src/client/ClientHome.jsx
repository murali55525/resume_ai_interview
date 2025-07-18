"use client"

import { useState, useEffect } from "react"
import { googleLogout, useGoogleLogin } from "@react-oauth/google"
import axios from "axios"
import ClientDashboard from "./ClientDashboard"
import InterviewCodeEntry from "./InterviewCodeEntry"

// Debounce utility to limit API calls
const debounce = (func, wait) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

function ClientHome({ onBack, task }) {
  const [stage, setStage] = useState("signin")
  const [user, setUser] = useState(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [institution, setInstitution] = useState("")
  const [education, setEducation] = useState("")
  const [linkedin, setLinkedin] = useState("")
  const [github, setGithub] = useState("")
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeAnalysis, setResumeAnalysis] = useState(null)
  const [answer, setAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const [interviewData, setInterviewData] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const mockTask = "Describe your experience with AI interviews and how you handle technical challenges."

  // Gemini API key
  const GEMINI_API_KEY = "AIzaSyBe2gAXouTuPzR0HuqY6cSLL40OWjblklw"

  // Check for existing user session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const savedUser = localStorage.getItem("clientUser")
        const savedStage = localStorage.getItem("clientStage")

        console.log("Checking saved session:", { savedUser: !!savedUser, savedStage })

        if (savedUser && savedStage) {
          const parsedUser = JSON.parse(savedUser)
          console.log("Found saved user:", parsedUser)

          setUser(parsedUser)
          setName(parsedUser.name || "")
          setEmail(parsedUser.email || "")

          // Check if user has an application in the database
          if (parsedUser.email) {
            try {
              const response = await axios.get(
                `http://localhost:5000/api/client/application?email=${encodeURIComponent(parsedUser.email)}`,
                { timeout: 10000 },
              )
              console.log("Found existing application:", response.data)
              setStage("dashboard")
            } catch (err) {
              console.log("No existing application found or server error:", err.response?.status)
              if (err.response?.status === 404) {
                // No application found, go to details
                setStage("details")
              } else {
                // Server error, but user is logged in, go to details
                setStage("details")
              }
            }
          } else {
            setStage(savedStage)
          }
        }
      } catch (err) {
        console.error("Error checking existing session:", err)
        // Clear corrupted session data
        localStorage.removeItem("clientUser")
        localStorage.removeItem("clientStage")
      } finally {
        setInitialLoading(false)
      }
    }

    checkExistingSession()
  }, [])

  // Save user session whenever user or stage changes (but not during initial load)
  useEffect(() => {
    if (!initialLoading && user) {
      console.log("Saving session:", { user: user.email, stage })
      localStorage.setItem("clientUser", JSON.stringify(user))
      localStorage.setItem("clientStage", stage)
    }
  }, [user, stage, initialLoading])

  // Progress calculation
  useEffect(() => {
    const fields = [name, email, phone, institution, education, linkedin, github, resumeFile]
    const completed = fields.filter((field) => field).length
    setProgress((completed / fields.length) * 100)
  }, [name, email, phone, institution, education, linkedin, github, resumeFile])

  // Google Login handler
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true)
        setError("")

        console.log("Google login successful, fetching user info...")

        const userInfo = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })

        const userData = userInfo.data
        console.log("User info received:", userData)

        setUser(userData)
        setName(userData.name || "")
        setEmail(userData.email || "")

        // Check if user already has an application
        try {
          console.log("Checking for existing application...")
          const appResponse = await axios.get(
            `http://localhost:5000/api/client/application?email=${encodeURIComponent(userData.email)}`,
            { timeout: 10000 },
          )
          console.log("Found existing application:", appResponse.data)
          setStage("dashboard")
        } catch (err) {
          console.log("No existing application found:", err.response?.status)
          if (err.response?.status === 404) {
            // No application found, proceed to details
            setStage("details")
          } else {
            // Server error, but proceed to details
            console.error("Server error checking application:", err)
            setStage("details")
          }
        }
      } catch (err) {
        setError("Failed to fetch user information. Please try again.")
        console.error("Google login error:", err)
      } finally {
        setIsLoading(false)
      }
    },
    onError: (error) => {
      console.error("Google Sign-In failed:", error)
      setError("Google Sign-In failed. Please try again.")
    },
    scope: "profile email",
  })

  // Check if resume already uploaded (debounced)
  const checkResumeStatus = debounce(async (emailToCheck) => {
    if (emailToCheck && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck)) {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/client/check-resume?email=${encodeURIComponent(emailToCheck)}`,
          { timeout: 5000 },
        )
        setUploadBlocked(res.data.exists)
        console.log("Resume check result:", res.data)
      } catch (err) {
        setUploadBlocked(false)
        console.error("Resume check error:", err)
        if (err.code === "ECONNREFUSED") {
          setError("Cannot connect to server. Please ensure the backend server is running on http://localhost:5000")
        }
      }
    }
  }, 500)

  useEffect(() => {
    if (email && stage === "details") {
      checkResumeStatus(email)
    }
  }, [email, stage])

  // Resume parsing with Gemini API
  const handleUpload = async (e) => {
    if (uploadBlocked) return
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!file) return

    setIsLoading(true)
    setResumeFile(file)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const resumeText = evt.target.result

        const response = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
          {
            contents: [
              {
                parts: [
                  {
                    text: `Parse the following resume text and extract the details in JSON format. Ensure the output is a valid JSON object with the following fields:
                    - full_name: The candidate's full name
                    - email: The email address (e.g., user@domain.com)
                    - phone: The phone number (in any standard format, e.g., +1234567890, (123) 456-7890)
                    - institution: The most recent educational institution (e.g., university or college name)
                    - address: The candidate's address (city, state, country, or full address if available)
                    - experience: Years of relevant work experience (as a number or string, e.g., "5 years")
                    - education: Highest degree and field of study (e.g., "B.S. Computer Science")
                    - linkedin: LinkedIn profile URL (if available, e.g., https://linkedin.com/in/username)
                    - github: GitHub profile URL (if available, e.g., https://github.com/username)
                    - role: Suggested job role based on content
                    - skills: Array of key skills (e.g., ["JavaScript", "React"])

                    If a field is not found, return an empty string or empty array for skills. Handle various resume formats (e.g., PDF, DOCX, TXT) and ensure the output is valid JSON. Return only a valid JSON object.

                    Resume Text:
                    ${resumeText}`,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
          },
        )

        console.log("Gemini raw response:", response.data)

        let parsedData
        const responseText = response.data.candidates[0].content.parts[0].text
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/)
        if (jsonMatch && jsonMatch[1]) {
          parsedData = JSON.parse(jsonMatch[1])
        } else {
          parsedData = JSON.parse(responseText)
        }

        console.log("Parsed resume data:", parsedData)

        const overwriteExisting = true
        if (overwriteExisting || !name) setName(parsedData.full_name || "")
        if (overwriteExisting || !phone) setPhone(parsedData.phone || "")
        if (overwriteExisting || !institution) setInstitution(parsedData.institution || "")
        if (overwriteExisting || !education) setEducation(parsedData.education || "")
        if (overwriteExisting || !linkedin) setLinkedin(parsedData.linkedin || "")
        if (overwriteExisting || !github) setGithub(parsedData.github || "")

        setResumeAnalysis({
          role: parsedData.role || "General Position",
          skills: parsedData.skills || [],
        })
        setIsLoading(false)
      } catch (err) {
        setError("Failed to process resume with Gemini AI. Please check the resume format and try again.")
        console.error("Resume parsing error:", err.message, err.response?.data)
        setIsLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleUpload(e)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("name", name)
    formData.append("email", email)
    formData.append("phone", phone)
    formData.append("institution", institution)
    formData.append("education", education)
    formData.append("linkedin", linkedin)
    formData.append("github", github)
    formData.append("role", resumeAnalysis?.role || "")
    formData.append("skills", JSON.stringify(resumeAnalysis?.skills || []))
    if (resumeFile) formData.append("resume", resumeFile)

    try {
      console.log("Submitting application...")
      const response = await axios.post("http://localhost:5000/api/client/apply", formData, {
        timeout: 15000,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      console.log("Application submitted successfully:", response.data)
      setStage("dashboard")
    } catch (err) {
      console.error("Submit error:", err)
      if (err.code === "ECONNREFUSED") {
        setError("Cannot connect to server. Please ensure the backend server is running on http://localhost:5000")
      } else {
        setError(err?.response?.data?.error || "Failed to submit application. Please try again.")
      }
    }
    setIsLoading(false)
  }

  const handleInterviewSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setSubmitted(true)
      setIsLoading(false)
      setTimeout(() => setSubmitted(false), 5000)
    }, 2000)
  }

  const handleLogout = () => {
    console.log("Logging out...")
    googleLogout()
    setUser(null)
    setName("")
    setEmail("")
    setPhone("")
    setInstitution("")
    setEducation("")
    setLinkedin("")
    setGithub("")
    setResumeFile(null)
    setResumeAnalysis(null)
    setStage("signin")

    // Clear saved session
    localStorage.removeItem("clientUser")
    localStorage.removeItem("clientStage")
  }

  const handleCodeVerified = (data) => {
    setInterviewData(data)
    setStage("interview")
  }

  // Show loading during initial session check
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Loading your session...</span>
          </div>
        </div>
      </div>
    )
  }

  // Render different stages
  if (stage === "dashboard") {
    return <ClientDashboard user={user} onLogout={handleLogout} onInterviewCodeEntry={() => setStage("codeEntry")} />
  }

  if (stage === "codeEntry") {
    return <InterviewCodeEntry user={user} onCodeVerified={handleCodeVerified} onBack={() => setStage("dashboard")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-blue-200/20 to-indigo-200/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div
          className="absolute bottom-32 left-16 w-80 h-80 bg-gradient-to-r from-indigo-200/20 to-purple-200/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-100/30 to-indigo-100/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto animate-slide-in">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="relative inline-block mb-6 sm:mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-md animate-pulse"></div>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 sm:mb-4 tracking-tight">
              Client Portal
            </h1>
            <p className="text-gray-600 text-base sm:text-lg lg:text-xl font-medium px-4">
              {stage === "signin"
                ? "Sign in to begin your application"
                : stage === "details"
                  ? "Complete your professional profile"
                  : "Complete your interview assessment"}
            </p>
            {stage === "details" && (
              <div className="mt-6 sm:mt-8 max-w-xs sm:max-w-md mx-auto px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-gray-500">Profile Completion</span>
                  <span className="text-xs sm:text-sm text-blue-600 font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main Card */}
          <div className="relative mx-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl sm:rounded-3xl blur-xl"></div>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl border border-white/50">
              {/* Sign In Stage */}
              {stage === "signin" && (
                <div className="text-center space-y-6">
                  <div className="mb-8">
                    <div className="inline-block p-4 bg-blue-50 rounded-2xl mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 016 6v2a6 6 0 01-12 0V8a6 6 0 016-6zm-2 8a2 2 0 104 0 2 2 0 00-4 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Welcome Back</h3>
                    <p className="text-gray-600 text-base sm:text-lg px-4">
                      Please sign in with your Google account to continue with your application.
                    </p>
                  </div>

                  <button
                    onClick={() => handleGoogleLogin()}
                    disabled={isLoading}
                    className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 text-gray-700 py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span className="group-hover:text-blue-600 transition-colors duration-300">
                          Continue with Google
                        </span>
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Details Stage */}
              {stage === "details" && (
                <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
                  <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-blue-50 rounded-xl mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Professional Profile</h3>
                    <p className="text-gray-600">
                      Welcome, {name || "User"}! Please complete your profile information.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Full Name *</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                      />
                    </div>

                    {/* Email and Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Email Address *</label>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          type="email"
                          placeholder="your.email@example.com"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Phone Number *</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Institution and Education */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Institution *</label>
                        <input
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                          required
                          placeholder="University/College name"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Education *</label>
                        <input
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                          required
                          placeholder="B.S. Computer Science"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* LinkedIn and GitHub */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">LinkedIn Profile</label>
                        <input
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          placeholder="LinkedIn URL (optional)"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">GitHub Profile</label>
                        <input
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          placeholder="GitHub URL (optional)"
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-blue-50/50 transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resume Upload Section */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Upload Your Resume *</label>
                    {uploadBlocked ? (
                      <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-800 text-center font-medium">
                        Resume already uploaded for this email. Please wait for HR instructions.
                      </div>
                    ) : (
                      !resumeFile && (
                        <div
                          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                            dragActive
                              ? "border-blue-400 bg-blue-50 scale-105"
                              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            accept=".txt,.md,.pdf,.doc,.docx"
                            onChange={handleUpload}
                            required
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadBlocked}
                          />
                          {isLoading ? (
                            <div className="space-y-4">
                              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                <svg
                                  className="w-8 h-8 text-blue-600 animate-spin"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              </div>
                              <p className="text-gray-600 font-medium">Analyzing your resume...</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                <svg
                                  className="w-8 h-8 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-gray-700 text-lg font-semibold mb-2">
                                  {dragActive ? "Drop your resume here" : "Drag & drop your resume"}
                                </p>
                                <p className="text-gray-500 text-sm mb-4">or click to browse files</p>
                                <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">PDF</span>
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">DOC</span>
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">TXT</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {resumeFile && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-green-800 font-semibold">{resumeFile.name}</p>
                            <p className="text-green-600 text-sm">
                              {(resumeFile.size / 1024).toFixed(1)} KB • Uploaded successfully
                            </p>
                          </div>
                          <div className="text-green-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {resumeAnalysis && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-blue-800 font-bold text-lg mb-3">AI Resume Analysis</h4>
                            <div className="space-y-2">
                              <div>
                                <span className="text-blue-700 font-medium">Suggested Role: </span>
                                <span className="text-gray-800 font-semibold">{resumeAnalysis.role}</span>
                              </div>
                              <div>
                                <span className="text-blue-700 font-medium">Key Skills: </span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {resumeAnalysis.skills.map((skill, i) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={!name || !email || !phone || !institution || !education || !resumeFile || isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none transition-all duration-300 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-700"></div>
                      <div className="relative flex items-center justify-center space-x-3">
                        {isLoading ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>Processing Application...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>Submit Application</span>
                          </>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full mt-4 text-gray-500 hover:text-gray-700 underline text-center py-2 font-medium transition-colors duration-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </form>
              )}

              {/* Interview Stage */}
              {stage === "interview" && (
                <form className="space-y-8" onSubmit={handleInterviewSubmit}>
                  <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-indigo-50 rounded-xl mb-4">
                      <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Interview Assessment</h3>
                    <p className="text-gray-600">Please provide a thoughtful and comprehensive response</p>
                  </div>

                  {/* Question Card */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-indigo-800 mb-3">Interview Question</h4>
                        <p className="text-gray-700 leading-relaxed font-medium">
                          {interviewData?.task || task || mockTask}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Answer Section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Your Response *</label>
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      required
                      placeholder="Share your thoughts, experiences, and insights here. Be specific and provide examples where possible..."
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-indigo-50/50 transition-all duration-300 resize-none leading-relaxed"
                      rows={8}
                    />
                    <div className="flex justify-between items-center text-sm">
                      <span
                        className={`px-3 py-1 rounded-full ${answer.length < 50 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                      >
                        {answer.length < 50 ? "Minimum 50 characters recommended" : "Great length!"}
                      </span>
                      <span className="text-gray-500 font-medium">{answer.length} characters</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={answer.length < 10 || isLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none transition-all duration-300 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-700"></div>
                      <div className="relative flex items-center justify-center space-x-3">
                        {isLoading ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>Submitting Response...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                            <span>Submit Response</span>
                          </>
                        )}
                      </div>
                    </button>

                    {submitted && (
                      <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-xl p-8 animate-slide-in">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-green-800 font-bold text-xl mb-3">Response Submitted Successfully!</h4>
                          <p className="text-green-700 leading-relaxed mb-4">
                            Thank you for completing the interview assessment. Our team will review your response and
                            contact you within 2-3 business days.
                          </p>
                          <div className="p-4 bg-green-100 rounded-lg">
                            <p className="text-green-800 text-sm font-medium">📧 Confirmation email sent to {email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full mt-4 text-gray-500 hover:text-gray-700 underline text-center py-2 font-medium transition-colors duration-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientHome
