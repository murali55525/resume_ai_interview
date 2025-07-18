"use client"

import { useState, useEffect } from "react"
import axios from "axios"

function AdminDashboard({ onLogout }) {
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState(null)

  // Fetch applicants data
  const fetchApplicants = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/applicants")
      setApplicants(response.data)
      setError("")
    } catch (err) {
      setError("Failed to fetch applicants data")
      console.error("Fetch error:", err)
      // Demo data fallback
      setApplicants([
        {
          _id: "1",
          name: "Alice Smith",
          email: "alice@example.com",
          role: "Frontend Developer",
          status: "pending",
          phone: "+1 (555) 123-4567",
          institution: "MIT",
          education: "B.S. Computer Science",
          skills: ["React", "JavaScript", "CSS"],
          createdAt: new Date().toISOString(),
        },
        {
          _id: "2",
          name: "Bob Lee",
          email: "bob@example.com",
          role: "Backend Engineer",
          status: "under_review",
          phone: "+1 (555) 234-5678",
          institution: "Stanford University",
          education: "M.S. Software Engineering",
          skills: ["Node.js", "Python", "MongoDB"],
          createdAt: new Date().toISOString(),
        },
        {
          _id: "3",
          name: "Carol Jones",
          email: "carol@example.com",
          role: "Data Scientist",
          status: "approved",
          phone: "+1 (555) 345-6789",
          institution: "UC Berkeley",
          education: "Ph.D. Data Science",
          skills: ["Python", "Machine Learning", "SQL"],
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplicants()
  }, [])

  const handleApprove = async (applicantId, applicantEmail, applicantName) => {
    setProcessingId(applicantId)
    try {
      await axios.post("/api/admin/approve-applicant", {
        applicantId,
        email: applicantEmail,
        name: applicantName,
      })

      // Update local state
      setApplicants((prev) => prev.map((app) => (app._id === applicantId ? { ...app, status: "approved" } : app)))

      alert(`Interview code sent to ${applicantEmail}`)
    } catch (err) {
      console.error("Approval error:", err)
      alert("Failed to approve applicant. Please try again.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (applicantId, applicantEmail) => {
    setProcessingId(applicantId)
    try {
      await axios.post("/api/admin/reject-applicant", {
        applicantId,
        email: applicantEmail,
      })

      // Update local state
      setApplicants((prev) => prev.map((app) => (app._id === applicantId ? { ...app, status: "rejected" } : app)))

      alert(`Rejection email sent to ${applicantEmail}`)
    } catch (err) {
      console.error("Rejection error:", err)
      alert("Failed to reject applicant. Please try again.")
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-amber-100 text-amber-800 border-amber-200"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      case "under_review":
        return "Under Review"
      default:
        return "Pending"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Loading applicants...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <header className="bg-white/90 backdrop-blur-xl shadow-lg border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-gray-600">Manage candidate applications</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchApplicants}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </button>
              <button
                onClick={onLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-5 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applicants.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applicants.filter((app) => app.status === "pending").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applicants.filter((app) => app.status === "approved").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/50">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applicants.filter((app) => app.status === "rejected").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Applicants Table */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Candidate Applications</h2>
            <p className="text-gray-600">Review and manage candidate applications</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Candidate</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Role & Skills</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applicants.map((applicant) => (
                  <tr key={applicant._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{applicant.name}</div>
                        <div className="text-sm text-gray-500">{applicant.institution}</div>
                        <div className="text-xs text-gray-400">{applicant.education}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">{applicant.email}</div>
                      <div className="text-sm text-gray-500">{applicant.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-blue-600 mb-2">{applicant.role}</div>
                      <div className="flex flex-wrap gap-1">
                        {applicant.skills?.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {applicant.skills?.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                            +{applicant.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          applicant.status,
                        )}`}
                      >
                        {getStatusText(applicant.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {applicant.status === "pending" || applicant.status === "under_review" ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(applicant._id, applicant.email, applicant.name)}
                            disabled={processingId === applicant._id}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === applicant._id ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Approving...</span>
                              </div>
                            ) : (
                              "Approve"
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(applicant._id, applicant.email)}
                            disabled={processingId === applicant._id}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === applicant._id ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {applicant.status === "approved" ? "Interview Sent" : "Completed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {applicants.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500">No applications found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
