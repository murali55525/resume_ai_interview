"use client"

import { useState, useEffect } from "react"
import axios from "axios"

// Sample questions for different rounds
const APTITUDE_QUESTIONS = [
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
    question: "If x + 5 = 12, what is the value of x?",
    options: ["5", "6", "7", "8"],
    correct: "7",
  },
  {
    id: 4,
    question: "What comes next in the sequence: 2, 4, 8, 16, ?",
    options: ["24", "28", "32", "36"],
    correct: "32",
  },
  {
    id: 5,
    question: "A rectangle has length 8m and width 6m. What is its area?",
    options: ["42 sq m", "48 sq m", "54 sq m", "56 sq m"],
    correct: "48 sq m",
  },
  {
    id: 6,
    question: "If 3x = 21, what is x?",
    options: ["6", "7", "8", "9"],
    correct: "7",
  },
  {
    id: 7,
    question: "What is the square root of 144?",
    options: ["10", "11", "12", "13"],
    correct: "12",
  },
  {
    id: 8,
    question: "If a book costs $15 and is discounted by 20%, what is the final price?",
    options: ["$10", "$11", "$12", "$13"],
    correct: "$12",
  },
  {
    id: 9,
    question: "What is 7 × 8?",
    options: ["54", "56", "58", "60"],
    correct: "56",
  },
  {
    id: 10,
    question: "If there are 24 hours in a day, how many minutes are there?",
    options: ["1440", "1400", "1480", "1500"],
    correct: "1440",
  },
]

const CODING_QUESTIONS = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description:
      "Given an array of integers and a target sum, return indices of two numbers that add up to the target.",
    example: "Input: [2,7,11,15], target = 9\nOutput: [0,1]",
    template: `function twoSum(nums, target) {
    // Your code here
    
}`,
  },
  {
    id: 2,
    title: "Palindrome Check",
    difficulty: "Easy",
    description: "Write a function to check if a given string is a palindrome (reads the same forwards and backwards).",
    example: "Input: 'racecar'\nOutput: true",
    template: `function isPalindrome(s) {
    // Your code here
    
}`,
  },
  {
    id: 3,
    title: "Fibonacci Sequence",
    difficulty: "Medium",
    description: "Write a function to return the nth number in the Fibonacci sequence.",
    example: "Input: n = 6\nOutput: 8 (sequence: 0,1,1,2,3,5,8)",
    template: `function fibonacci(n) {
    // Your code here
    
}`,
  },
]

const HR_QUESTIONS = [
  "Tell me about yourself and your background.",
  "Why are you interested in this position?",
  "What are your greatest strengths and weaknesses?",
  "Describe a challenging situation you faced and how you handled it.",
  "Where do you see yourself in 5 years?",
]

function InterviewPlatform({ user, interviewData, onComplete, onBack }) {
  const [currentRound, setCurrentRound] = useState("aptitude") // aptitude, coding, hr
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes for aptitude
  const [answers, setAnswers] = useState({
    aptitude: [],
    coding: [],
    hr: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roundComplete, setRoundComplete] = useState(false)

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !roundComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      handleRoundComplete()
    }
  }, [timeLeft, roundComplete])

  // Set timer based on round
  useEffect(() => {
    switch (currentRound) {
      case "aptitude":
        setTimeLeft(900) // 15 minutes
        break
      case "coding":
        setTimeLeft(2700) // 45 minutes
        break
      case "hr":
        setTimeLeft(1200) // 20 minutes
        break
    }
    setCurrentQuestion(0)
    setRoundComplete(false)
  }, [currentRound])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAptitudeAnswer = (questionId, selectedAnswer) => {
    const question = APTITUDE_QUESTIONS.find((q) => q.id === questionId)
    const newAnswer = {
      question: question.question,
      selectedAnswer,
      correctAnswer: question.correct,
      isCorrect: selectedAnswer === question.correct,
    }

    setAnswers((prev) => ({
      ...prev,
      aptitude: [...prev.aptitude.filter((a) => a.question !== question.question), newAnswer],
    }))
  }

  const handleCodingAnswer = (questionId, solution) => {
    const question = CODING_QUESTIONS.find((q) => q.id === questionId)
    const newAnswer = {
      question: question.title,
      solution,
      score: solution.length > 50 ? Math.min(10, Math.floor(solution.length / 20)) : 0, // Simple scoring
    }

    setAnswers((prev) => ({
      ...prev,
      coding: [...prev.coding.filter((a) => a.question !== question.title), newAnswer],
    }))
  }

  const handleHRAnswer = (questionIndex, answer) => {
    const newAnswer = {
      question: HR_QUESTIONS[questionIndex],
      answer,
      score: answer.length > 100 ? Math.min(10, Math.floor(answer.length / 50)) : 0, // Simple scoring
    }

    setAnswers((prev) => ({
      ...prev,
      hr: [...prev.hr.filter((a) => a.question !== HR_QUESTIONS[questionIndex]), newAnswer],
    }))
  }

  const calculateScores = () => {
    const aptitudeScore = (answers.aptitude.filter((a) => a.isCorrect).length / APTITUDE_QUESTIONS.length) * 100
    const codingScore = answers.coding.reduce((sum, a) => sum + a.score, 0) * 3.33 // Scale to 100
    const hrScore = answers.hr.reduce((sum, a) => sum + a.score, 0) * 2 // Scale to 100

    return {
      aptitudeScore: Math.round(aptitudeScore),
      codingScore: Math.round(Math.min(codingScore, 100)),
      hrScore: Math.round(Math.min(hrScore, 100)),
      totalScore: Math.round((aptitudeScore + Math.min(codingScore, 100) + Math.min(hrScore, 100)) / 3),
    }
  }

  const handleRoundComplete = () => {
    setRoundComplete(true)
    setTimeLeft(0)
  }

  const handleNextRound = () => {
    if (currentRound === "aptitude") {
      setCurrentRound("coding")
    } else if (currentRound === "coding") {
      setCurrentRound("hr")
    } else {
      handleCompleteInterview()
    }
  }

  const handleCompleteInterview = async () => {
    setIsSubmitting(true)
    try {
      const scores = calculateScores()
      const interviewResults = {
        ...scores,
        aptitudeAnswers: answers.aptitude,
        codingAnswers: answers.coding,
        hrAnswers: answers.hr,
      }

      await axios.post("http://localhost:5000/api/client/submit-interview", {
        email: user.email,
        interviewResults,
      })

      onComplete(interviewResults)
    } catch (error) {
      console.error("Failed to submit interview:", error)
      alert("Failed to submit interview. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderAptitudeRound = () => {
    const question = APTITUDE_QUESTIONS[currentQuestion]
    const userAnswer = answers.aptitude.find((a) => a.question === question.question)

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-800">
              Question {currentQuestion + 1} of {APTITUDE_QUESTIONS.length}
            </h3>
            <div className="text-blue-600 font-mono text-lg">{formatTime(timeLeft)}</div>
          </div>
          <p className="text-gray-800 text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                  userAnswer?.selectedAnswer === option
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={userAnswer?.selectedAnswer === option}
                  onChange={() => handleAptitudeAnswer(question.id, option)}
                  className="mr-3"
                />
                <span className="text-gray-800">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentQuestion === APTITUDE_QUESTIONS.length - 1 ? (
            <button
              onClick={handleRoundComplete}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              Complete Aptitude Round
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Next
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderCodingRound = () => {
    const question = CODING_QUESTIONS[currentQuestion]
    const userAnswer = answers.coding.find((a) => a.question === question.title)

    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-green-800">
                Problem {currentQuestion + 1} of {CODING_QUESTIONS.length}: {question.title}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  question.difficulty === "Easy" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {question.difficulty}
              </span>
            </div>
            <div className="text-green-600 font-mono text-lg">{formatTime(timeLeft)}</div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">Problem Description:</h4>
            <p className="text-gray-700 mb-4">{question.description}</p>
            <h4 className="font-semibold text-gray-800 mb-2">Example:</h4>
            <pre className="bg-gray-100 p-3 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
              {question.example}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Your Solution:</h4>
            <textarea
              value={userAnswer?.solution || question.template}
              onChange={(e) => handleCodingAnswer(question.id, e.target.value)}
              className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:border-green-500"
              placeholder="Write your solution here..."
            />
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentQuestion === CODING_QUESTIONS.length - 1 ? (
            <button
              onClick={handleRoundComplete}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              Complete Coding Round
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              Next Problem
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderHRRound = () => {
    const question = HR_QUESTIONS[currentQuestion]
    const userAnswer = answers.hr.find((a) => a.question === question)

    return (
      <div className="space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-purple-800">
              Question {currentQuestion + 1} of {HR_QUESTIONS.length}
            </h3>
            <div className="text-purple-600 font-mono text-lg">{formatTime(timeLeft)}</div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-4 text-lg">{question}</h4>
            <textarea
              value={userAnswer?.answer || ""}
              onChange={(e) => handleHRAnswer(currentQuestion, e.target.value)}
              className="w-full h-40 p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Please provide a detailed answer..."
            />
            <div className="mt-2 text-sm text-gray-500">
              Characters: {userAnswer?.answer?.length || 0} (Minimum 100 recommended)
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentQuestion === HR_QUESTIONS.length - 1 ? (
            <button
              onClick={handleRoundComplete}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Complete HR Round
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderRoundComplete = () => {
    const roundNames = {
      aptitude: "Aptitude",
      coding: "Coding",
      hr: "HR",
    }

    const nextRoundNames = {
      aptitude: "Coding",
      coding: "HR",
      hr: null,
    }

    return (
      <div className="text-center space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">{roundNames[currentRound]} Round Complete!</h3>
          <p className="text-green-700">
            {nextRoundNames[currentRound]
              ? `Great job! Ready for the ${nextRoundNames[currentRound]} round?`
              : "Congratulations! You have completed all interview rounds."}
          </p>
        </div>

        {nextRoundNames[currentRound] ? (
          <button
            onClick={handleNextRound}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg"
          >
            Start {nextRoundNames[currentRound]} Round
          </button>
        ) : (
          <button
            onClick={handleCompleteInterview}
            disabled={isSubmitting}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Interview"}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-lg border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">AI Interview Platform</h1>
                <p className="text-gray-600">Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Round</div>
                <div className="font-semibold text-gray-800 capitalize">{currentRound}</div>
              </div>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-300"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Interview Progress</span>
            <span className="text-sm text-gray-500">
              {currentRound === "aptitude" ? "1" : currentRound === "coding" ? "2" : "3"} of 3 rounds
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${currentRound === "aptitude" ? "33%" : currentRound === "coding" ? "66%" : "100%"}`,
              }}
            />
          </div>
        </div>

        {/* Round Content */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
          {roundComplete
            ? renderRoundComplete()
            : currentRound === "aptitude"
              ? renderAptitudeRound()
              : currentRound === "coding"
                ? renderCodingRound()
                : renderHRRound()}
        </div>
      </main>
    </div>
  )
}

export default InterviewPlatform
