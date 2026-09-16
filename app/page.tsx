"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  ShieldCheck,
  UserCheck,
  LogOut,
  CalendarCheck2,
  History,
  Download,
  Filter,
  RotateCcw,
  AlertCircle,
  TableProperties,
  Sparkles,
  Paperclip,
  ExternalLink,
} from "lucide-react";

export default function PortalComponent() {
  const router = useRouter();

  // Authentication & Authorization State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"employee" | "admin" | null>(null);
  const [activeTab, setActiveTab] = useState<"employee" | "manager">("employee");
  const [loadingUser, setLoadingUser] = useState(true);

  // Work Logs, Attendance & Profiles State
  const [logs, setLogs] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);

  // Filter State (Manager View)
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  // Default to current Month: "YYYY-MM"
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  // Employee Form State
  const [department, setDepartment] = useState("Publications & Testing");
  const [taskCategory, setTaskCategory] = useState("Question Formation");
  const [stage, setStage] = useState("Proof 1");
  const [subjectBook, setSubjectBook] = useState("");
  const [topicName, setTopicName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fileAttachments, setFileAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 1. Session Lifecycle, Role Verification & Domain Check
  useEffect(() => {
    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const userEmail = session.user.email?.toLowerCase() || "";

      // Fetch user profile from Supabase
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const isAdmin = profile?.role === "admin";

      // Domain Whitelist Check for Manager/Admin
      if (isAdmin) {
        if (!userEmail.endsWith("@exampur.com")) {
          alert(
            "Access Denied: Only official @exampur.com Google Workspace accounts are authorized for Manager/Admin access."
          );
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login";
          return;
        }
        setUserRole("admin");
        setActiveTab("manager");
      } else {
        setUserRole("employee");
        setActiveTab("employee");
      }

      setCurrentUser(session.user);
      setLoadingUser(false);
      fetchData();
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Logs, Attendance, and Profiles
  const fetchData = async () => {
    try {
      const [logsRes, attendanceRes, profilesRes] = await Promise.all([
        supabase.from("work_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("attendance").select("*").order("date", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);

      if (logsRes.data) setLogs(logsRes.data);
      if (attendanceRes.data) setAttendanceRecords(attendanceRes.data);
      if (profilesRes.data) setProfilesList(profilesRes.data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  // Submit Work Log with 3MB File Size Limit Check
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // File validation: Max 3MB (3 * 1024 * 1024 bytes)
    if (fileAttachments.length > 0) {
      const file = fileAttachments[0];
      const maxSizeBytes = 3 * 1024 * 1024; // 3MB

      if (file.size > maxSizeBytes) {
        alert("File size exceeds 3MB limit! Please compress the screenshot or upload a smaller file.");
        return;
      }
    }

    setSubmitting(true);

    try {
      let attachmentUrl = "";

      // File upload handler
      if (fileAttachments.length > 0) {
        const file = fileAttachments[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("proofs")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("proofs")
          .getPublicUrl(fileName);

        attachmentUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase.from("work_logs").insert([
        {
          user_id: currentUser.id,
          employee_email: currentUser.email,
          department,
          task_category: taskCategory,
          stage,
          subject_book: subjectBook,
          topic_name: topicName,
          quantity: parseInt(quantity) || 0,
          proof_url: attachmentUrl,
          status: "pending",
        },
      ]);

      if (error) throw error;

      alert("Work log submitted successfully!");
      setSubjectBook("");
      setTopicName("");
      setQuantity("");
      setFileAttachments([]);
      fetchData();
    } catch (err: any) {
      alert("Submission error: " + (err.message || "Failed to submit task"));
    } finally {
      setSubmitting(false);
    }
  };

  // Manager Approve/Reject Handler
  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("work_logs")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    }
  };

  // Export Filtered Submissions to CSV for Manager / Payroll / Audits
  const handleExportCSV = () => {
    const filteredLogs = logs.filter((log) => {
      if (!selectedDateFilter) return true;
      return log.created_at?.startsWith(selectedDateFilter);
    });

    if (filteredLogs.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Date",
      "Employee Email",
      "Department",
      "Task Category",
      "Stage",
      "Subject / Book",
      "Topic Name",
      "Quantity",
      "Status",
      "Proof URL",
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.created_at ? log.created_at.slice(0, 10) : ""}"`,
      `"${log.employee_email || ""}"`,
      `"${log.department || ""}"`,
      `"${log.task_category || ""}"`,
      `"${log.stage || ""}"`,
      `"${(log.subject_book || "").replace(/"/g, '""')}"`,
      `"${(log.topic_name || "").replace(/"/g, '""')}"`,
      `"${log.quantity || 0}"`,
      `"${log.status || "pending"}"`,
      `"${log.proof_url || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `exampur_content_report_${selectedDateFilter || "all"}_${Date.now()}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white text-sm">
        <Sparkles className="w-5 h-5 animate-spin mr-2 text-[#ff5722]" /> Loading Operations Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200">
      {/* Top Navbar */}
      <nav className="bg-[#161b22] border-b border-gray-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="bg-[#ff5722] text-white text-xs font-black px-2.5 py-1 rounded tracking-wider">
            EXAMPUR
          </span>
          <span className="font-bold text-white tracking-wide text-sm hidden sm:inline">
            Content Operations
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Role badge */}
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-medium">
            {userRole === "admin" ? "Manager (Admin)" : "Employee"}
          </span>

          <span className="text-xs text-gray-400 hidden md:inline">
            {currentUser?.email}
          </span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-[#21262d] hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs if Admin */}
        {userRole === "admin" && (
          <div className="flex gap-2 border-b border-gray-800 pb-3">
            <button
              onClick={() => setActiveTab("manager")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === "manager"
                  ? "bg-[#ff5722] text-white"
                  : "text-gray-400 hover:text-white bg-[#161b22]"
              }`}
            >
              Manager Review Dashboard
            </button>
            <button
              onClick={() => setActiveTab("employee")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                activeTab === "employee"
                  ? "bg-[#ff5722] text-white"
                  : "text-gray-400 hover:text-white bg-[#161b22]"
              }`}
            >
              Employee Submission View
            </button>
          </div>
        )}

        {/* ---------------- EMPLOYEE VIEW ---------------- */}
        {activeTab === "employee" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Submission Form */}
            <div className="lg:col-span-1 bg-[#161b22] border border-gray-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#ff5722]" /> Submit Daily Work Log
              </h2>

              <form onSubmit={handleSubmitTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                  >
                    <option value="Publications & Testing">Publications & Testing</option>
                    <option value="Curriculum & Notes">Curriculum & Notes</option>
                    <option value="Question Bank Development">Question Bank Development</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Task Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                  >
                    <option value="Question Formation">Question Formation</option>
                    <option value="Proof Reading">Proof Reading</option>
                    <option value="Solution Drafting">Solution Drafting</option>
                    <option value="Translation">Translation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                  >
                    <option value="Proof 1">Proof 1</option>
                    <option value="Proof 2">Proof 2</option>
                    <option value="Final Quality Check">Final Quality Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Subject / Book
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samanya Gyan Vol 1"
                    value={subjectBook}
                    onChange={(e) => setSubjectBook(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Topic Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ancient History Harappa"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Units / Questions Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                    Attach Proof (PNG, JPG, PDF - Max 3MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        setFileAttachments(Array.from(e.target.files));
                      }
                    }}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-[#21262d] file:text-gray-300 hover:file:bg-gray-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg transition mt-4"
                >
                  {submitting ? "Uploading & Submitting..." : "Submit Daily Work Log"}
                </button>
              </form>
            </div>

            {/* Employee's Own Recent Logs */}
            <div className="lg:col-span-2 bg-[#161b22] border border-gray-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" /> My Recent Submissions
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#0d1117] text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="p-3">Topic / Subject</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3">Proof</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {logs
                      .filter((l) => l.user_id === currentUser?.id)
                      .slice(0, 10)
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-gray-800/30">
                          <td className="p-3">
                            <div className="font-semibold text-white">{log.topic_name}</div>
                            <div className="text-[11px] text-gray-500">{log.subject_book}</div>
                          </td>
                          <td className="p-3">
                            <div>{log.task_category}</div>
                            <div className="text-[10px] text-gray-500">{log.stage}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-white">{log.quantity}</td>
                          <td className="p-3">
                            {log.proof_url ? (
                              <a
                                href={log.proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-500">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                log.status === "approved"
                                  ? "bg-green-950 text-green-400 border border-green-800"
                                  : log.status === "rejected"
                                  ? "bg-red-950 text-red-400 border border-red-800"
                                  : "bg-yellow-950 text-yellow-400 border border-yellow-800"
                              }`}
                            >
                              {log.status || "pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {logs.filter((l) => l.user_id === currentUser?.id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          No submissions recorded yet today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- MANAGER REVIEW VIEW ---------------- */}
        {activeTab === "manager" && userRole === "admin" && (
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" /> Operational Submissions & Verification
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Review, approve and audit content team daily outputs.
                </p>
              </div>

              {/* Filters and CSV Export Button */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-[#0d1117] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter("")}
                    className="p-1.5 bg-[#21262d] text-gray-400 hover:text-white rounded-lg border border-gray-700"
                    title="Clear filter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] text-white border border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  title="Export filtered submissions to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#ff5722]" /> Export CSV
                </button>
              </div>
            </div>

            {/* Submissions Review Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#0d1117] text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Topic / Subject</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Quantity</th>
                    <th className="p-3">Proof</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs
                    .filter((log) => {
                      if (!selectedDateFilter) return true;
                      return log.created_at?.startsWith(selectedDateFilter);
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-gray-800/30">
                        <td className="p-3">
                          <div className="font-semibold text-white">
                            {log.employee_email?.split("@")[0]}
                          </div>
                          <div className="text-[10px] text-gray-500">{log.employee_email}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-white font-medium">{log.topic_name}</div>
                          <div className="text-[10px] text-gray-500">{log.subject_book}</div>
                        </td>
                        <td className="p-3">
                          <div>{log.task_category}</div>
                          <div className="text-[10px] text-gray-500">{log.stage}</div>
                        </td>
                        <td className="p-3 text-center font-bold text-white">{log.quantity}</td>
                        <td className="p-3">
                          {log.proof_url ? (
                            <a
                              href={log.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              Proof <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-500">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.status === "approved"
                                ? "bg-green-950 text-green-400 border border-green-800"
                                : log.status === "rejected"
                                ? "bg-red-950 text-red-400 border border-red-800"
                                : "bg-yellow-950 text-yellow-400 border border-yellow-800"
                            }`}
                          >
                            {log.status || "pending"}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {log.status !== "approved" && (
                            <button
                              onClick={() => handleUpdateStatus(log.id, "approved")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold transition"
                            >
                              Approve
                            </button>
                          )}
                          {log.status !== "rejected" && (
                            <button
                              onClick={() => handleUpdateStatus(log.id, "rejected")}
                              className="bg-red-600/80 hover:bg-red-500 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold transition"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">
                        No work logs available for review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}