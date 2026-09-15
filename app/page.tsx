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
  FileText
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

  // 1. Session Lifecycle, Role Verification & Auto-Expire Listener
  useEffect(() => {
    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      setCurrentUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setUserRole("admin");
        setActiveTab("manager");
      } else {
        setUserRole("employee");
        setActiveTab("employee");
      }

      setLoadingUser(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

  // 2. Realtime Listeners
  useEffect(() => {
    fetchLogs();
    fetchAttendance();
    fetchProfiles();

    const logsChannel = supabase
      .channel("realtime-work-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_logs" },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    const attendanceChannel = supabase
      .channel("realtime-attendance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("realtime-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [currentUser]);

  async function fetchLogs() {
    const { data } = await supabase
      .from("work_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLogs(data);
  }

  async function fetchProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProfilesList(data);
  }

  async function fetchAttendance() {
    const { data: attData } = await supabase
      .from("attendance")
      .select("*")
      .order("attendance_date", { ascending: false });

    if (!attData) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        const identifier = p.email || p.full_name || p.username;
        if (identifier) {
          profileMap.set(String(p.id), identifier);
        }
      });
    }

    const resolved = attData.map((rec) => {
      let displayName = profileMap.get(String(rec.user_id));

      if (!displayName && currentUser && String(rec.user_id) === String(currentUser.id)) {
        displayName = currentUser.email;
      }

      return {
        ...rec,
        user_display: displayName || `Employee (${String(rec.user_id).slice(0, 8)}...)`,
      };
    });

    setAttendanceRecords(resolved);
  }

  // 3. Manual Logout Handler
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  }

  // Helper to parse attachment URLs
  function parseAttachmentUrls(urlField: string | null | undefined): string[] {
    if (!urlField) return [];
    try {
      if (urlField.startsWith("[")) {
        return JSON.parse(urlField);
      }
      return urlField.split(",").map((s) => s.trim()).filter(Boolean);
    } catch {
      return [urlField];
    }
  }

  // 4. Strict Work Submission Handler (All Columns & Proof Mandatory)
  async function handleWorkSubmit(e: React.FormEvent) {
    e.preventDefault();

    // STRICT VALIDATION: Koi bhi field khali nahi ho sakti
    if (!department.trim()) {
      alert("Please select a Department.");
      return;
    }

    if (department === "Publications & Testing" && !taskCategory.trim()) {
      alert("Please select a Task Type.");
      return;
    }

    if (department === "Publications & Testing" && taskCategory === "Proofing" && !stage.trim()) {
      alert("Please select a Proofing Stage.");
      return;
    }

    if (!subjectBook.trim()) {
      alert("Please fill in Subject / Book Name.");
      return;
    }

    if (!topicName.trim()) {
      alert("Please fill in Topic / Chapter Name.");
      return;
    }

    const parsedQty = parseInt(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert("Please enter a valid Quantity greater than 0.");
      return;
    }

    // MANDATORY PROOF ATTACHMENT: Kam se kam 1 file honi hi chahiye
    if (!fileAttachments || fileAttachments.length === 0) {
      alert("Proof attachment is mandatory! Please attach at least 1 file (PDF, Screenshot, or Photo).");
      return;
    }

    setSubmitting(true);
    const activeUserId = currentUser?.id;

    const uploadedUrls: string[] = [];

    // Upload each chosen file
    try {
      for (let i = 0; i < fileAttachments.length; i++) {
        const file = fileAttachments[i];
        const fileExt = file.name.split(".").pop();
        const cleanFileName = `${activeUserId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `proofs/${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("work-proofs")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert(`File "${file.name}" upload failed: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("work-proofs")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }
    } catch (err: any) {
      alert("Upload error: " + err.message);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("work_logs").insert([
      {
        user_id: activeUserId,
        department: department,
        task_category: department === "DTP" ? "DTP Work" : taskCategory,
        stage: department === "Publications & Testing" && taskCategory === "Proofing" ? stage : null,
        subject_book: subjectBook.trim(),
        topic_name: topicName.trim(),
        quantity: parsedQty,
        status: "pending",
        attachment_url: uploadedUrls.join(","),
      },
    ]);

    setSubmitting(false);
    if (!error) {
      setSubjectBook("");
      setTopicName("");
      setQuantity("");
      setFileAttachments([]);
      const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      alert(`Work log with ${uploadedUrls.length} attachment(s) submitted successfully!`);
      fetchLogs();
    } else {
      alert("Error: " + error.message);
    }
  }

  async function updateStatus(logId: string, newStatus: "approved" | "rejected") {
    let remarks = "Approved by Manager";
    if (newStatus === "rejected") {
      const inputRemarks = prompt("Enter specific reason for rejection:");
      if (inputRemarks === null) return;
      remarks = inputRemarks.trim() === "" ? "Rejected by Manager (No comments)" : inputRemarks;
    }

    const { error } = await supabase
      .from("work_logs")
      .update({ status: newStatus, manager_remarks: remarks })
      .eq("id", logId);

    if (error) alert("Error: " + error.message);
    else {
      fetchAttendance();
      fetchLogs();
    }
  }

  // CSV Export Utility
  function exportToCSV(filename: string, rows: object[]) {
    if (!rows || !rows.length) {
      alert("No data available to export!");
      return;
    }
    const separator = ",";
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      "\n" +
      rows
        .map((row: any) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? "" : row[k];
              cell = String(cell).replace(/"/g, '""');
              if (String(cell).search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Days in Selected Month
  const monthDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonthFilter.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonthFilter]);

  // Master Timesheet calculation
  const masterTimesheetData = useMemo(() => {
    const userMap = new Map<string, { email: string; createdAt?: string }>();
    
    profilesList.forEach((p) => {
      if (p.id && !p.id.startsWith("00000000")) {
        userMap.set(String(p.id), {
          email: p.email || p.full_name || "Employee",
          createdAt: p.created_at,
        });
      }
    });

    if (currentUser && !currentUser.id.startsWith("00000000")) {
      userMap.set(String(currentUser.id), {
        email: currentUser.email,
        createdAt: currentUser.created_at,
      });
    }

    logs.forEach((l) => {
      if (l.user_id && !l.user_id.startsWith("00000000") && !userMap.has(String(l.user_id))) {
        userMap.set(String(l.user_id), {
          email: `Employee (${String(l.user_id).slice(0, 8)}...)`,
        });
      }
    });

    const monthLogs = logs.filter(
      (l) => l.created_at && l.created_at.startsWith(selectedMonthFilter)
    );
    const monthAtt = attendanceRecords.filter(
      (a) => a.attendance_date && a.attendance_date.startsWith(selectedMonthFilter)
    );

    return Array.from(userMap.entries()).map(([userId, userInfo]) => {
      const dailyUnits: { [day: number]: number } = {};
      monthDays.forEach((d) => (dailyUnits[d] = 0));

      let monthTotalUnits = 0;

      monthLogs
        .filter((l) => String(l.user_id) === userId && l.status === "approved")
        .forEach((log) => {
          const logDate = new Date(log.created_at);
          const day = logDate.getDate();
          const qty = Number(log.quantity) || 0;
          dailyUnits[day] = (dailyUnits[day] || 0) + qty;
          monthTotalUnits += qty;
        });

      const userPresentDates = new Set(
        monthAtt
          .filter((a) => String(a.user_id) === userId && a.status === "PRESENT")
          .map((a) => a.attendance_date)
      );
      const totalPresentDays = userPresentDates.size;
      const dailyAvg = totalPresentDays > 0 ? (monthTotalUnits / totalPresentDays).toFixed(1) : "0";

      return {
        userId,
        email: userInfo.email,
        joinDate: userInfo.createdAt ? userInfo.createdAt.slice(0, 10) : "Active",
        dailyUnits,
        monthTotalUnits,
        totalPresentDays,
        dailyAvg,
      };
    }).sort((a, b) => b.monthTotalUnits - a.monthTotalUnits);
  }, [logs, attendanceRecords, profilesList, selectedMonthFilter, monthDays, currentUser]);

  // Real-time Queue Date Filtering
  const filteredLogs = useMemo(() => {
    if (!selectedDateFilter) return logs;
    return logs.filter((log) => {
      const logDate = log.created_at ? log.created_at.slice(0, 10) : "";
      return logDate === selectedDateFilter;
    });
  }, [logs, selectedDateFilter]);

  const filteredAttendance = useMemo(() => {
    if (!selectedDateFilter) return attendanceRecords;
    return attendanceRecords.filter((rec) => rec.attendance_date === selectedDateFilter);
  }, [attendanceRecords, selectedDateFilter]);

  const myPersonalLogs = logs.filter(
    (log) => currentUser && String(log.user_id) === String(currentUser.id)
  );

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Authenticating session & verifying credentials...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded font-mono">EXAMPUR</span>
              Content Operations & Work Audit Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time Daily Performance Matrix, Dynamic Timesheet & Verification</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <p className="text-xs text-slate-200 font-medium">{currentUser?.email}</p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase inline-block mt-0.5 ${
                  userRole === "admin"
                    ? "bg-purple-950/70 text-purple-300 border-purple-800"
                    : "bg-blue-950/70 text-blue-300 border-blue-800"
                }`}
              >
                {userRole === "admin" ? "Manager (Admin)" : "Employee"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-700/50 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("employee")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition cursor-pointer ${
              activeTab === "employee" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Employee View
          </button>

          {userRole === "admin" && (
            <button
              type="button"
              onClick={() => setActiveTab("manager")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition cursor-pointer flex items-center gap-2 ${
                activeTab === "manager" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <TableProperties className="w-4 h-4" />
              Manager Master Dashboard (Ashish Sir)
            </button>
          )}
        </div>

        {/* Employee View */}
        {activeTab === "employee" ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Send className="w-5 h-5 text-orange-500" /> Daily Work Log Submission
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  <span className="text-rose-400 font-semibold">* All fields and proof attachments are strictly mandatory.</span>
                </p>
              </div>

              <form onSubmit={handleWorkSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-slate-300 block mb-2 font-medium">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer"
                  >
                    <option value="Publications & Testing">Publications & Testing</option>
                    <option value="DTP">DTP</option>
                  </select>
                </div>

                {department === "Publications & Testing" && (
                  <div>
                    <label className="text-xs text-slate-300 block mb-2 font-medium">
                      Task Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer"
                    >
                      <option value="Question Formation">Question Formation</option>
                      <option value="Content Creation">Content Creation</option>
                      <option value="Proofing">Proofing</option>
                    </select>
                  </div>
                )}

                {department === "Publications & Testing" && taskCategory === "Proofing" && (
                  <div>
                    <label className="text-xs text-slate-300 block mb-2 font-medium">
                      Proofing Stage <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer"
                    >
                      <option value="Proof 1">Proof 1</option>
                      <option value="Proof 2">Proof 2</option>
                      <option value="Final Proof">Final Proof</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 block mb-2 font-medium">
                    Subject / Book Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., RRB Maths Practice Set"
                    value={subjectBook}
                    onChange={(e) => setSubjectBook(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-2 font-medium">
                    Topic / Chapter <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Number System Part 1"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-2 font-medium">
                    Quantity (Pages / Questions) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g., 40"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                {/* STRICT MANDATORY PROOF ATTACHMENT */}
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-300 block mb-2 font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                      Attach Work Proof (PDF / Images) <span className="text-rose-500">* Mandatory</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Hold Ctrl to select multiple</span>
                  </label>
                  <input
                    id="file-upload-input"
                    type="file"
                    required
                    multiple
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      if (e.target.files) {
                        setFileAttachments(Array.from(e.target.files));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
                  />
                  {fileAttachments.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {fileAttachments.length} file(s) attached:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {fileAttachments.map((f, i) => (
                          <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {f.name} ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-400/90 mt-1">
                      Form cannot be submitted without attaching at least one proof document.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-600 hover:bg-orange-500 font-medium py-3 rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Validating & Submitting...
                      </>
                    ) : (
                      "Submit Daily Work Log"
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* My Submissions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-base text-white">My Submissions & Approval Status</h3>
                </div>
                <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full font-medium">
                  Total Logs: {myPersonalLogs.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Subject & Topic</th>
                      <th className="p-3.5">Units</th>
                      <th className="p-3.5">Attached Proofs</th>
                      <th className="p-3.5">Approval Status</th>
                      <th className="p-3.5">Manager Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {myPersonalLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500 text-xs">
                          You haven't submitted any work logs yet.
                        </td>
                      </tr>
                    ) : (
                      myPersonalLogs.map((log) => {
                        const urls = parseAttachmentUrls(log.attachment_url);
                        return (
                          <tr key={log.id} className="hover:bg-slate-800/30">
                            <td className="p-3.5 text-slate-400 text-xs font-mono">
                              {log.created_at ? new Date(log.created_at).toLocaleDateString("en-IN") : "Today"}
                            </td>
                            <td className="p-3.5">
                              <span className="font-medium text-slate-200">{log.task_category}</span>
                              {log.stage && <span className="text-[11px] block text-slate-500">{log.stage}</span>}
                            </td>
                            <td className="p-3.5">
                              <div className="text-slate-200">{log.subject_book}</div>
                              <div className="text-xs text-slate-400">{log.topic_name}</div>
                            </td>
                            <td className="p-3.5 text-orange-400 font-semibold">{log.quantity}</td>
                            
                            <td className="p-3.5">
                              {urls.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {urls.map((u, idx) => (
                                    <a
                                      key={idx}
                                      href={u}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-200 bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded"
                                    >
                                      Doc {idx + 1}
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>

                            <td className="p-3.5">
                              {log.status === "pending" && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                                  <Clock className="w-3 h-3" /> Pending Review
                                </span>
                              )}
                              {log.status === "approved" && (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Approved (Present)
                                </span>
                              )}
                              {log.status === "rejected" && (
                                <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-400/10 px-2 py-1 rounded font-medium">
                                  <XCircle className="w-3 h-3" /> Rejected
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-xs">
                              {log.status === "rejected" ? (
                                <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/40 border border-rose-900/60 px-2.5 py-1.5 rounded-lg w-fit">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{log.manager_remarks || "No reason specified"}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">{log.manager_remarks || "—"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Manager Master Dashboard View */
          <div className="space-y-8">

            {/* 1. MASTER DAILY ADD-ON PERFORMANCE GRID */}
            <div className="bg-slate-900 border border-orange-500/30 rounded-xl overflow-hidden p-6 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-base text-white">Daily Output Matrix (30-Day Master Register)</h3>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <input
                    type="month"
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const csvRows = masterTimesheetData.map((emp) => {
                        const row: any = {
                          Employee_Email: emp.email,
                          Joined_Or_Active: emp.joinDate,
                        };
                        monthDays.forEach((day) => {
                          row[`Day_${String(day).padStart(2, "0")}`] = emp.dailyUnits[day] || 0;
                        });
                        row["Month_Total_Workdone"] = emp.monthTotalUnits;
                        row["Total_Days_Present"] = emp.totalPresentDays;
                        row["Daily_Avg_Output"] = emp.dailyAvg;
                        return row;
                      });
                      exportToCSV(`Exampur_Master_Timesheet_${selectedMonthFilter}`, csvRows);
                    }}
                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-950"
                  >
                    <Download className="w-4 h-4" />
                    Export Senior 30-Day Report (CSV)
                  </button>
                </div>
              </div>

              {/* Scrollable Horizontal Matrix Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
                    <tr>
                      <th className="p-3 sticky left-0 bg-slate-950 z-20 min-w-[200px] border-r border-slate-800">
                        Employee (Live Status)
                      </th>

                      {monthDays.map((day) => (
                        <th key={day} className="p-2.5 text-center min-w-[42px] border-r border-slate-800/60">
                          {String(day).padStart(2, "0")}
                        </th>
                      ))}

                      <th className="p-3 text-center min-w-[120px] bg-orange-950/30 text-orange-400 font-bold border-l border-r border-slate-800">
                        Total Workdone
                      </th>
                      <th className="p-3 text-center min-w-[100px] bg-emerald-950/30 text-emerald-400 font-bold border-r border-slate-800">
                        Active Days
                      </th>
                      <th className="p-3 text-center min-w-[90px] bg-slate-950 text-slate-300 font-bold">
                        Daily Avg
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {masterTimesheetData.length === 0 ? (
                      <tr>
                        <td colSpan={monthDays.length + 4} className="p-6 text-center text-slate-500">
                          No employee records found for this month.
                        </td>
                      </tr>
                    ) : (
                      masterTimesheetData.map((emp) => (
                        <tr key={emp.userId} className="hover:bg-slate-800/40">
                          <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                            <div className="text-slate-200 font-semibold truncate max-w-[180px]">
                              {emp.email}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                              Active: {emp.joinDate}
                            </div>
                          </td>

                          {monthDays.map((day) => {
                            const val = emp.dailyUnits[day];
                            return (
                              <td key={day} className="p-2 text-center border-r border-slate-800/50 font-mono text-[11px]">
                                {val > 0 ? (
                                  <span className="inline-block bg-orange-500/10 text-orange-400 font-bold px-1.5 py-0.5 rounded border border-orange-500/20">
                                    {val}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-3 text-center bg-orange-950/20 border-l border-r border-slate-800 font-mono font-bold text-sm text-orange-400">
                            {emp.monthTotalUnits} <span className="text-[10px] font-normal">units</span>
                          </td>

                          <td className="p-3 text-center bg-emerald-950/20 border-r border-slate-800 font-mono font-semibold text-emerald-400">
                            {emp.totalPresentDays} <span className="text-[10px] text-slate-400">days</span>
                          </td>

                          <td className="p-3 text-center font-mono font-medium text-slate-300">
                            {emp.dailyAvg} <span className="text-[10px] text-slate-500">/day</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. REALTIME APPROVAL QUEUE WITH PROOF VERIFICATION */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-sm">Real-time Approval & Verification Queue</h3>
                    <p className="text-xs text-slate-400">Click any attached document to verify before approving.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-lg">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={selectedDateFilter}
                      onChange={(e) => setSelectedDateFilter(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
                    />
                    {selectedDateFilter && (
                      <button
                        type="button"
                        onClick={() => setSelectedDateFilter("")}
                        title="Clear Date Filter"
                        className="text-slate-400 hover:text-white"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      exportToCSV(
                        "exampur_work_logs_raw",
                        filteredLogs.map((l) => ({
                          ID: l.id,
                          User_ID: l.user_id,
                          Department: l.department,
                          Category: l.task_category,
                          Stage: l.stage || "",
                          Subject: l.subject_book,
                          Topic: l.topic_name,
                          Quantity: l.quantity,
                          Proof_URLs: l.attachment_url || "No Attachment",
                          Status: l.status,
                          Remarks: l.manager_remarks || "",
                          Date: l.created_at,
                        }))
                      )
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    Export Raw Logs
                  </button>

                  <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300">
                    Pending: {filteredLogs.filter((l) => l.status === "pending").length}
                  </span>
                </div>
              </div>

              {selectedDateFilter && (
                <div className="text-[11px] text-orange-400 bg-orange-950/30 border border-orange-900/50 px-3 py-1.5 rounded-md inline-block">
                  Filtered by Date: <b>{selectedDateFilter}</b>
                </div>
              )}
            </div>

            {/* Approval Queue Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Subject & Topic</th>
                    <th className="p-4">Output</th>
                    <th className="p-4">Proof (Verify)</th>
                    <th className="p-4">Status & Remarks</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        {selectedDateFilter
                          ? "No submissions found for the selected date."
                          : "No submissions recorded yet. Submit a task using Employee View."}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const urls = parseAttachmentUrls(log.attachment_url);
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="p-4 text-slate-400 text-xs font-mono">
                            {log.created_at ? log.created_at.slice(0, 10) : "Today"}
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-slate-200">{log.task_category}</span>
                            {log.stage && <span className="text-xs block text-slate-500">{log.stage}</span>}
                          </td>
                          <td className="p-4">
                            <div className="text-slate-200">{log.subject_book}</div>
                            <div className="text-xs text-slate-400">{log.topic_name}</div>
                          </td>
                          <td className="p-4 text-orange-400 font-semibold">{log.quantity} units</td>
                          
                          <td className="p-4">
                            {urls.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {urls.map((u, idx) => (
                                  <a
                                    key={idx}
                                    href={u}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-800 hover:bg-cyan-800 hover:text-white transition"
                                  >
                                    <FileText className="w-3 h-3 text-cyan-400" />
                                    Proof {idx + 1}
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs italic">No file attached</span>
                            )}
                          </td>

                          <td className="p-4">
                            {log.status === "pending" && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {log.status === "approved" && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {log.status === "rejected" && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs text-rose-400 bg-rose-400/10 px-2 py-1 rounded font-medium">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                              {log.manager_remarks && (
                                <p className="text-[11px] text-rose-300/80 italic max-w-xs truncate" title={log.manager_remarks}>
                                  Reason: {log.manager_remarks}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {log.status === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateStatus(log.id, "approved")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(log.id, "rejected")}
                                className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Action completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 3. DAILY ATTENDANCE REGISTER */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-base text-white">Daily Attendance Register</h3>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    exportToCSV(
                      "exampur_attendance_register",
                      filteredAttendance.map((a) => ({
                        ID: a.id,
                        User_Display: a.user_display,
                        User_UUID: a.user_id,
                        Date: a.attendance_date,
                        Status: a.status,
                        Approved_By_UUID: a.approved_by,
                      }))
                    )
                  }
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Export Attendance CSV
                </button>

                <span className="text-xs bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-lg font-medium">
                  Total: {filteredAttendance.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="p-3.5">Attendance Date</th>
                    <th className="p-3.5">Employee Details</th>
                    <th className="p-3.5">Attendance Status</th>
                    <th className="p-3.5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 text-xs">
                        {selectedDateFilter
                          ? "No attendance records found for this date."
                          : "No attendance marked yet. Approve a work log from above to automatically mark attendance."}
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 text-slate-300 font-mono text-xs">
                          {record.attendance_date}
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-200 font-medium text-xs">
                            {record.user_display}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ID: {record.user_id}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-xs text-slate-400 font-mono">
                          Auto-Verified by Trigger
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  </main>
);
}