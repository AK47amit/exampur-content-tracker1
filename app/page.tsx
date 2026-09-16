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
  FileText, 
  Trash2, 
  UserPlus, 
  Briefcase, 
  CheckSquare, 
  BookOpen,
  X,
  Layers,
  BellRing,
  AlertTriangle
} from "lucide-react";

export default function PortalComponent() {
  const router = useRouter();

  // Authentication & Authorization State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"employee" | "admin" | null>(null);
  const [activeTab, setActiveTab] = useState<"employee" | "manager">("employee");
  const [loadingUser, setLoadingUser] = useState(true);

  // Active Tasks Modal & Flash Alert State
  const [showActiveTasksModal, setShowActiveTasksModal] = useState(false);
  const [flashAlert, setFlashAlert] = useState<{
    show: boolean;
    type: "rejected" | "pending_assigned" | "clean";
    title: string;
    message: string;
  } | null>(null);

  // Work Logs, Attendance, Profiles & Assignments State
  const [logs, setLogs] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

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
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Manager Assignment Form State
  const [assigneeId, setAssigneeId] = useState("");
  const [assignDept, setAssignDept] = useState("Publications & Testing");
  const [assignCategory, setAssignCategory] = useState("Question Formation");
  const [assignStage, setAssignStage] = useState("Proof 1");
  const [assignSubject, setAssignSubject] = useState("");
  const [assignTopic, setAssignTopic] = useState("");
  const [assignQty, setAssignQty] = useState("");
  const [assigning, setAssigning] = useState(false);

  // 1. Session Lifecycle, Role Verification & Domain Check
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
        if (!session.user.email?.toLowerCase().endsWith("@exampur.com")) {
          alert("Access Denied: Only @exampur.com Google Workspace accounts are authorized for Manager access.");
          await supabase.auth.signOut();
          window.location.href = "/login";
          return;
        }
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
    fetchAssignments();

    const logsChannel = supabase
      .channel("realtime-work-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_logs" }, () => fetchLogs())
      .subscribe();

    const attendanceChannel = supabase
      .channel("realtime-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchAttendance())
      .subscribe();

    const profilesChannel = supabase
      .channel("realtime-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfiles())
      .subscribe();

    const assignmentsChannel = supabase
      .channel("realtime-assignments")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, () => fetchAssignments())
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(assignmentsChannel);
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
    if (data) {
      setProfilesList(data);
      if (data.length > 0 && !assigneeId) {
        setAssigneeId(data[0].id);
      }
    }
  }

  async function fetchAssignments() {
    const { data } = await supabase
      .from("task_assignments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAssignments(data);
  }

  async function fetchAttendance() {
    const { data: attData } = await supabase
      .from("attendance")
      .select("*")
      .order("attendance_date", { ascending: false });

    if (!attData) return;

    const { data: profiles } = await supabase.from("profiles").select("*");
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        const identifier = p.email || p.full_name || p.username;
        if (identifier) profileMap.set(String(p.id), identifier);
      });
    }

    const resolved = attData.map((rec) => ({
      ...rec,
      user_display: profileMap.get(String(rec.user_id)) || (currentUser && String(rec.user_id) === String(currentUser.id) ? currentUser.email : `Employee (${String(rec.user_id).slice(0, 8)}...)`),
    }));

    setAttendanceRecords(resolved);
  }

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

  function parseAttachmentUrls(urlField: string | null | undefined): string[] {
    if (!urlField) return [];
    try {
      if (urlField.startsWith("[")) return JSON.parse(urlField);
      return urlField.split(",").map((s) => s.trim()).filter(Boolean);
    } catch {
      return [urlField];
    }
  }

  // Employee-Specific Submissions & Dynamic Remembering of Books
  const myPersonalLogs = useMemo(() => {
    return logs.filter((log) => currentUser && String(log.user_id) === String(currentUser.id));
  }, [logs, currentUser]);

  const myPendingLogs = useMemo(() => {
    return myPersonalLogs.filter((l) => l.status === "pending");
  }, [myPersonalLogs]);

  const myRejectedLogs = useMemo(() => {
    return myPersonalLogs.filter((l) => l.status === "rejected");
  }, [myPersonalLogs]);

  const myRememberedBooks = useMemo(() => {
    const set = new Set<string>();
    myPersonalLogs.forEach((l) => {
      if (l.subject_book && l.subject_book.trim()) set.add(l.subject_book.trim());
    });
    return Array.from(set);
  }, [myPersonalLogs]);

  const myAssignedTasks = useMemo(() => {
    return assignments.filter((a) => currentUser && String(a.assigned_to) === String(currentUser.id) && a.status !== "completed");
  }, [assignments, currentUser]);

  // 3. Employee Login Reminder Flash Alert (Auto-disappears after 7 seconds)
  useEffect(() => {
    if (userRole !== "employee" || !currentUser) return;

    if (myRejectedLogs.length > 0) {
      const recentRejected = myRejectedLogs[0];
      setFlashAlert({
        show: true,
        type: "rejected",
        title: `Attention: ${myRejectedLogs.length} Submission(s) Rejected!`,
        message: `"${recentRejected.topic_name}" was rejected. Reason: ${recentRejected.manager_remarks || "Please re-check and submit proof again."}`,
      });
    } else if (myAssignedTasks.length > 0) {
      setFlashAlert({
        show: true,
        type: "pending_assigned",
        title: `Reminder: ${myAssignedTasks.length} Assigned Task(s) Pending!`,
        message: `You have operational tasks assigned by manager awaiting completion today.`,
      });
    }

    const timer = setTimeout(() => {
      setFlashAlert(null);
    }, 7000);

    return () => clearTimeout(timer);
  }, [userRole, currentUser, myRejectedLogs.length, myAssignedTasks.length]);

  function selectTaskToWork(task: any) {
    setDepartment(task.department || "Publications & Testing");
    setTaskCategory(task.task_category || "Question Formation");
    setStage(task.stage || "Proof 1");
    setSubjectBook(task.subject_book || "");
    setTopicName(task.topic_name || "");
    setQuantity(String(task.target_quantity || ""));
    setCompletingTaskId(task.id);
    setShowActiveTasksModal(false);
    window.scrollTo({ top: 350, behavior: "smooth" });
  }

  async function handleWorkSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!department.trim() || !subjectBook.trim() || !topicName.trim()) {
      alert("Please fill in Department, Subject/Book, and Topic.");
      return;
    }

    const parsedQty = parseInt(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert("Please enter a valid Quantity greater than 0.");
      return;
    }

    if (!fileAttachments || fileAttachments.length === 0) {
      alert("Proof attachment is mandatory! Please attach at least 1 file (PDF or Image).");
      return;
    }

    const MAX_FILE_SIZE = 3 * 1024 * 1024;
    for (let i = 0; i < fileAttachments.length; i++) {
      if (fileAttachments[i].size > MAX_FILE_SIZE) {
        alert(`File "${fileAttachments[i].name}" exceeds 3MB! Please compress.`);
        return;
      }
    }

    const MAX_TOTAL_BATCH = 10 * 1024 * 1024;
    const totalBytes = fileAttachments.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_BATCH) {
      alert("Total batch size exceeds 10MB limit!");
      return;
    }

    setSubmitting(true);
    const activeUserId = currentUser?.id;
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < fileAttachments.length; i++) {
        const file = fileAttachments[i];
        const fileExt = file.name.split(".").pop();
        const cleanFileName = `${activeUserId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `proofs/${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("work-proofs")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          alert(`File upload failed: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from("work-proofs").getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) uploadedUrls.push(publicUrlData.publicUrl);
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

    if (!error && completingTaskId) {
      await supabase
        .from("task_assignments")
        .update({ status: "completed" })
        .eq("id", completingTaskId);
      setCompletingTaskId(null);
      fetchAssignments();
    }

    setSubmitting(false);
    if (!error) {
      setSubjectBook("");
      setTopicName("");
      setQuantity("");
      setFileAttachments([]);
      const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      alert(`Work log submitted successfully! Proof attached.`);
      fetchLogs();
    } else {
      alert("Error: " + error.message);
    }
  }

  // 4. Manager Create Task Assignment (Cleaned - No Deadline Column)
  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneeId || !assignSubject.trim() || !assignTopic.trim() || !assignQty) {
      alert("Please fill in all assignment details.");
      return;
    }

    setAssigning(true);
    const { error } = await supabase.from("task_assignments").insert([
      {
        assigned_to: assigneeId,
        assigned_by: currentUser?.id,
        department: assignDept,
        task_category: assignDept === "DTP" ? "DTP Work" : assignCategory,
        stage: assignDept === "Publications & Testing" && assignCategory === "Proofing" ? assignStage : null,
        subject_book: assignSubject.trim(),
        topic_name: assignTopic.trim(),
        target_quantity: parseInt(assignQty),
        status: "assigned"
      }
    ]);

    setAssigning(false);
    if (error) {
      alert("Failed to assign task: " + error.message);
    } else {
      alert("Task assigned successfully to the employee!");
      setAssignSubject("");
      setAssignTopic("");
      setAssignQty("");
      fetchAssignments();
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

  async function handleClearAllLogs() {
    const isFirstConfirmed = confirm(
      "WARNING: Are you sure you want to permanently delete ALL work logs?\n\nThis will completely reset all dashboard metrics and timesheet records. This action cannot be undone."
    );
    if (!isFirstConfirmed) return;

    const userInput = prompt("Type 'RESET' in capital letters to confirm permanent deletion of all work logs:");
    if (userInput !== "RESET") {
      alert("Reset cancelled. Verification text did not match.");
      return;
    }

    const { error } = await supabase
      .from("work_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) alert("Error clearing logs: " + error.message);
    else {
      alert("All work logs have been successfully wiped.");
      fetchLogs();
    }
  }

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
        .map((row: any) =>
          keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? "" : row[k];
              cell = String(cell).replace(/"/g, '""');
              return cell.search(/("|,|\n)/g) >= 0 ? `"${cell}"` : cell;
            })
            .join(separator)
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const monthDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonthFilter.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonthFilter]);

  const masterTimesheetData = useMemo(() => {
    const userMap = new Map<string, { email: string; createdAt?: string }>();
    profilesList.forEach((p) => {
      if (p.id && !p.id.startsWith("00000000")) {
        userMap.set(String(p.id), { email: p.email || p.full_name || "Employee", createdAt: p.created_at });
      }
    });

    const monthLogs = logs.filter((l) => l.created_at && new Date(l.created_at).toLocaleDateString("en-CA").startsWith(selectedMonthFilter));
    const monthAtt = attendanceRecords.filter((a) => a.attendance_date && a.attendance_date.startsWith(selectedMonthFilter));

    return Array.from(userMap.entries()).map(([userId, userInfo]) => {
      const dailyUnits: { [day: number]: number } = {};
      monthDays.forEach((d) => (dailyUnits[d] = 0));
      let monthTotalUnits = 0;

      monthLogs
        .filter((l) => String(l.user_id) === userId && l.status === "approved")
        .forEach((log) => {
          const day = new Date(log.created_at).getDate();
          const qty = Number(log.quantity) || 0;
          dailyUnits[day] = (dailyUnits[day] || 0) + qty;
          monthTotalUnits += qty;
        });

      const userPresentDates = new Set(
        monthAtt.filter((a) => String(a.user_id) === userId && a.status === "PRESENT").map((a) => a.attendance_date)
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
  }, [logs, attendanceRecords, profilesList, selectedMonthFilter, monthDays]);

  const filteredLogs = useMemo(() => {
    if (!selectedDateFilter) return logs;
    return logs.filter((log) => log.created_at && new Date(log.created_at).toLocaleDateString("en-CA") === selectedDateFilter);
  }, [logs, selectedDateFilter]);

  const summaryMetrics = useMemo(() => {
    const totalCount = logs.length;
    const approvedCount = logs.filter((l) => l.status === "approved").length;
    const pendingCount = logs.filter((l) => l.status === "pending").length;
    const rejectedCount = logs.filter((l) => l.status === "rejected").length;
    const totalUnitsProduced = logs
      .filter((l) => l.status === "approved")
      .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

    return { totalCount, approvedCount, pendingCount, rejectedCount, totalUnitsProduced };
  }, [logs]);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <Sparkles className="w-5 h-5 animate-spin mr-2 text-orange-500" />
        Authenticating session & verifying credentials...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 relative">
      
      {/* Smart Login Reminder Flash Toast Notification */}
      {flashAlert && flashAlert.show && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
            flashAlert.type === "rejected"
              ? "bg-rose-950/90 border-rose-700 text-rose-200"
              : "bg-amber-950/90 border-amber-700 text-amber-200"
          }`}>
            {flashAlert.type === "rejected" ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <BellRing className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
            )}
            <div className="flex-1 text-xs">
              <p className="font-bold text-white mb-0.5">{flashAlert.title}</p>
              <p className="text-slate-300 leading-relaxed">{flashAlert.message}</p>
            </div>
            <button
              onClick={() => setFlashAlert(null)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800/50 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded font-mono">EXAMPUR</span>
              Content Operations & Work Audit Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time Daily Performance Matrix, Delegation & Verification</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <p className="text-xs text-slate-200 font-medium">{currentUser?.email}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase inline-block mt-0.5 ${
                userRole === "admin" ? "bg-purple-950/70 text-purple-300 border-purple-800" : "bg-blue-950/70 text-blue-300 border-blue-800"
              }`}>
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
              Manager Master Dashboard
            </button>
          )}
        </div>

        {/* ================= EMPLOYEE VIEW ================= */}
        {activeTab === "employee" ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            
            {/* Employee Operational KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setShowActiveTasksModal(true)}
                className="bg-slate-900 hover:bg-slate-800/80 border border-orange-500/50 hover:border-orange-500 p-4 rounded-xl text-left transition duration-200 cursor-pointer shadow-lg group relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <p className="text-xs text-orange-400 font-semibold group-hover:text-orange-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> My Active Tasks (Pending/Assigned)
                  </p>
                  <span className="text-[10px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-700/40">View List &rarr;</span>
                </div>
                <p className="text-2xl font-bold text-orange-400 mt-2">
                  {myAssignedTasks.length + myPendingLogs.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {myAssignedTasks.length} Assigned &bull; {myPendingLogs.length} Under Review
                </p>
              </button>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-xs text-emerald-400 font-medium">My Approved Submissions</p>
                <p className="text-2xl font-bold text-emerald-400 mt-2">
                  {myPersonalLogs.filter(l => l.status === "approved").length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Verified output records</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl col-span-2 sm:col-span-1">
                <p className="text-xs text-blue-400 font-medium">My Total Units Produced</p>
                <p className="text-2xl font-bold text-blue-400 mt-2">
                  {myPersonalLogs.filter(l => l.status === "approved").reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Cumulative verified count</p>
              </div>
            </div>

            {/* Submission Form */}
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
                  <label className="text-xs text-slate-300 block mb-2 font-medium">Department <span className="text-rose-500">*</span></label>
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
                    <label className="text-xs text-slate-300 block mb-2 font-medium">Task Type <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer"
                    >
                      <option value="Question Formation">Question Formation</option>
                      <option value="Content Creation / Theory Writing">Content Creation / Theory Writing</option>
                      <option value="Proofing">Proofing</option>
                      <option value="Solution Drafting">Solution Drafting</option>
                      <option value="Translation">Translation</option>
                      <option value="Review / Fact Check">Review / Fact Check</option>
                    </select>
                  </div>
                )}

                {department === "Publications & Testing" && taskCategory === "Proofing" && (
                  <div>
                    <label className="text-xs text-slate-300 block mb-2 font-medium">Proofing Stage <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer"
                    >
                      <option value="Proof 1">Proof 1</option>
                      <option value="Proof 2">Proof 2</option>
                      <option value="Final Quality Check">Final Quality Check</option>
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-slate-300 font-medium">
                      Subject / Book Name <span className="text-rose-500">*</span>
                    </label>
                    {myRememberedBooks.length > 0 && (
                      <span className="text-[10px] text-orange-400 font-mono">
                        {myRememberedBooks.length} Saved Books
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    list="remembered-books"
                    required
                    placeholder="Type or select from your past books..."
                    value={subjectBook}
                    onChange={(e) => setSubjectBook(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none"
                  />
                  <datalist id="remembered-books">
                    {myRememberedBooks.map((book, idx) => (
                      <option key={idx} value={book} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-2 font-medium">Topic / Chapter Name <span className="text-rose-500">*</span></label>
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
                  <label className="text-xs text-slate-300 block mb-2 font-medium">Quantity Completed <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g., 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-300 block mb-2 font-medium">
                    Attach Mandatory Proof (Max 3MB per file, Max 10MB total) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="file-upload-input"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    required
                    onChange={(e) => {
                      if (!e.target.files) return;
                      const selected = Array.from(e.target.files);
                      const MAX_SINGLE = 3 * 1024 * 1024;
                      const MAX_BATCH = 10 * 1024 * 1024;

                      const oversizedFile = selected.find((f) => f.size > MAX_SINGLE);
                      if (oversizedFile) {
                        alert(`File "${oversizedFile.name}" exceeds 3MB limit!`);
                        e.target.value = "";
                        setFileAttachments([]);
                        return;
                      }

                      const total = selected.reduce((acc, f) => acc + f.size, 0);
                      if (total > MAX_BATCH) {
                        alert("Total batch size exceeds 10MB limit!");
                        e.target.value = "";
                        setFileAttachments([]);
                        return;
                      }

                      setFileAttachments(selected);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Uploading Proof & Submitting..." : (completingTaskId ? "Submit Proof & Complete Assigned Task" : "Submit Daily Work Log")}
                  </button>
                </div>
              </form>
            </div>

            {/* Employee's Own Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-300">
                <History className="w-4 h-4 text-orange-500" /> My Recent Submissions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Topic / Subject</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3">Proof</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {myPersonalLogs.slice(0, 10).map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-semibold text-white">{l.topic_name}</div>
                          <div className="text-[10px] text-slate-500">{l.subject_book}</div>
                        </td>
                        <td className="p-3">
                          <div>{l.task_category}</div>
                          {l.stage && <div className="text-[10px] text-slate-500">{l.stage}</div>}
                        </td>
                        <td className="p-3 text-center font-bold text-white">{l.quantity}</td>
                        <td className="p-3">
                          {parseAttachmentUrls(l.attachment_url).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1 mr-2">
                              Proof {i + 1} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            l.status === "approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                            l.status === "rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                            "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}>
                            {l.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myPersonalLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">No submissions logged yet today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ================= MANAGER MASTER DASHBOARD ================= */
          <div className="space-y-8">
            
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-xs text-slate-400 font-medium">Total Entries</p>
                <p className="text-2xl font-bold text-white mt-1">{summaryMetrics.totalCount}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-xs text-emerald-400 font-medium">Approved</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{summaryMetrics.approvedCount}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-xs text-amber-400 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{summaryMetrics.pendingCount}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-xs text-rose-400 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">{summaryMetrics.rejectedCount}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl col-span-2 md:col-span-1">
                <p className="text-xs text-orange-400 font-medium">Approved Output</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{summaryMetrics.totalUnitsProduced}</p>
              </div>
            </div>

            {/* Manager Task Delegation Window */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                  <UserPlus className="w-4 h-4 text-orange-500" /> Delegate Task to Registered Employee
                </h3>
                <span className="text-xs text-slate-400">{profilesList.length} Registered Team Members</span>
              </div>

              <form onSubmit={handleAssignTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Assign To Employee *</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none cursor-pointer"
                  >
                    {profilesList.map((p) => (
                      <option key={p.id} value={p.id}>{p.email || p.full_name || p.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Department *</label>
                  <select
                    value={assignDept}
                    onChange={(e) => setAssignDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none cursor-pointer"
                  >
                    <option value="Publications & Testing">Publications & Testing</option>
                    <option value="DTP">DTP</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Task Category *</label>
                  <select
                    value={assignCategory}
                    onChange={(e) => setAssignCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none cursor-pointer"
                  >
                    <option value="Question Formation">Question Formation</option>
                    <option value="Content Creation / Theory Writing">Content Creation / Theory Writing</option>
                    <option value="Proofing">Proofing</option>
                    <option value="Solution Drafting">Solution Drafting</option>
                    <option value="Translation">Translation</option>
                    <option value="Review / Fact Check">Review / Fact Check</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Target Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={assignQty}
                    onChange={(e) => setAssignQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Subject / Book Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RRB Reasoning"
                    value={assignSubject}
                    onChange={(e) => setAssignSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Topic / Chapter Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coding Decoding Part 1"
                    value={assignTopic}
                    onChange={(e) => setAssignTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {assigning ? "Assigning..." : "Assign Task"}
                  </button>
                </div>
              </form>

              {/* Manager Assigned Tasks Table */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-orange-500" /> Currently Delegated Tasks ({assignments.length})
                </h4>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Employee</th>
                        <th className="p-2">Topic / Book</th>
                        <th className="p-2 text-center">Target Qty</th>
                        <th className="p-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {assignments.slice(0, 10).map((a) => {
                        const employee = profilesList.find(p => p.id === a.assigned_to);
                        return (
                          <tr key={a.id} className="hover:bg-slate-800/40">
                            <td className="p-2 text-white font-medium">{employee?.email || a.assigned_to.slice(0, 8)}</td>
                            <td className="p-2">
                              <span className="font-semibold text-white">{a.topic_name}</span>
                              <span className="text-slate-500 block text-[10px]">{a.subject_book}</span>
                            </td>
                            <td className="p-2 text-center font-bold text-orange-400">{a.target_quantity}</td>
                            <td className="p-2 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                a.status === "completed" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-300 border border-amber-800"
                              }`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {assignments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-slate-500">No delegated tasks yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Filter Bar with CSV Export & Reset Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-slate-300 font-semibold uppercase">Daily Queue Filter:</span>
                </div>
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 outline-none"
                />
                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter("")}
                    className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs cursor-pointer"
                    title="Clear filter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = filteredLogs.map((l) => ({
                      Date: l.created_at ? new Date(l.created_at).toLocaleDateString("en-CA") : "",
                      Department: l.department || "",
                      Task_Category: l.task_category || "",
                      Stage: l.stage || "",
                      Subject_Book: l.subject_book || "",
                      Topic_Name: l.topic_name || "",
                      Quantity: l.quantity || 0,
                      Status: l.status || "pending",
                      Remarks: l.manager_remarks || "",
                      Proof_URL: l.attachment_url || "",
                    }));
                    exportToCSV(`exampur_work_logs_${selectedDateFilter || "all"}`, exportRows);
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-orange-500" />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={handleClearAllLogs}
                  className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/80 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  title="Wipe and clean all work logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset All Logs
                </button>
              </div>
            </div>

            {/* Real-time Submissions Queue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Operational Submissions & Verification Queue
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Topic / Subject</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3">Proof</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {l.created_at ? new Date(l.created_at).toLocaleDateString("en-CA") : ""}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{l.topic_name}</div>
                          <div className="text-[10px] text-slate-500">{l.subject_book}</div>
                        </td>
                        <td className="p-3">
                          <div>{l.task_category}</div>
                          {l.stage && <div className="text-[10px] text-slate-500">{l.stage}</div>}
                        </td>
                        <td className="p-3 text-center font-bold text-white">{l.quantity}</td>
                        <td className="p-3">
                          {parseAttachmentUrls(l.attachment_url).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1 mr-2">
                              Proof {i + 1} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            l.status === "approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                            l.status === "rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                            "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}>
                            {l.status || "pending"}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {l.status !== "approved" && (
                            <button
                              onClick={() => updateStatus(l.id, "approved")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {l.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(l.id, "rejected")}
                              className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">No logs found for the selected period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Master Performance Timesheet Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                    <TableProperties className="w-4 h-4 text-orange-500" />
                    Monthly Master Timesheet (Performance Matrix)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Approved production units broken down by calendar days</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const exportMatrixRows = masterTimesheetData.map((d) => {
                        const rowObj: any = {
                          Employee: d.email,
                          JoinDate: d.joinDate,
                          TotalUnits: d.monthTotalUnits,
                          DaysPresent: d.totalPresentDays,
                          DailyAverage: d.dailyAvg,
                        };
                        monthDays.forEach((day) => {
                          rowObj[`Day_${day}`] = d.dailyUnits[day] || 0;
                        });
                        return rowObj;
                      });
                      exportToCSV(`exampur_master_timesheet_${selectedMonthFilter}`, exportMatrixRows);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-500" />
                    Export Matrix
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 sticky left-0 bg-slate-950 z-20 min-w-[180px]">Employee</th>
                      <th className="p-2.5 text-center min-w-[70px]">Total</th>
                      <th className="p-2.5 text-center min-w-[60px]">Present</th>
                      <th className="p-2.5 text-center min-w-[60px]">Daily Avg</th>
                      {monthDays.map((day) => (
                        <th key={day} className="p-2 text-center min-w-[32px]">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {masterTimesheetData.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-800/40">
                        <td className="p-2.5 sticky left-0 bg-slate-900 font-medium text-white z-10 border-r border-slate-800">{row.email}</td>
                        <td className="p-2.5 text-center font-bold text-orange-400 bg-slate-950/40">{row.monthTotalUnits}</td>
                        <td className="p-2.5 text-center text-slate-300 font-mono">{row.totalPresentDays}</td>
                        <td className="p-2.5 text-center text-emerald-400 font-semibold font-mono">{row.dailyAvg}</td>
                        {monthDays.map((day) => {
                          const units = row.dailyUnits[day];
                          return (
                            <td key={day} className={`p-2 text-center text-[11px] font-mono ${units > 0 ? "text-white font-bold bg-slate-800/60" : "text-slate-600"}`}>
                              {units > 0 ? units : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {masterTimesheetData.length === 0 && (
                      <tr>
                        <td colSpan={monthDays.length + 4} className="p-6 text-center text-slate-500">No timesheet data recorded for this month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= ACTIVE TASKS POPUP MODAL ================= */}
        {showActiveTasksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-600/20 text-orange-500 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Active Tasks Overview</h3>
                    <p className="text-xs text-slate-400">Assigned delegation & pending verification logs</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActiveTasksModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Section 1: Assigned by Manager */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Delegated By Manager ({myAssignedTasks.length})
                    </h4>
                    <span className="text-[10px] text-slate-500">Awaiting your completion</span>
                  </div>

                  {myAssignedTasks.length > 0 ? (
                    <div className="space-y-2.5">
                      {myAssignedTasks.map((task) => (
                        <div key={task.id} className="bg-slate-950 border border-slate-800 hover:border-orange-500/40 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">{task.topic_name}</span>
                              <span className="text-[10px] bg-orange-950 text-orange-300 border border-orange-800 px-2 py-0.5 rounded font-mono">
                                Target: {task.target_quantity} Units
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Book: <span className="text-slate-200">{task.subject_book}</span> &bull; {task.task_category}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectTaskToWork(task)}
                            className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Work on this Task
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
                      No delegated tasks assigned by manager right now.
                    </div>
                  )}
                </div>

                {/* Section 2: Under Review Submissions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Manager Review ({myPendingLogs.length})
                    </h4>
                    <span className="text-[10px] text-slate-500">Submitted & awaiting verification</span>
                  </div>

                  {myPendingLogs.length > 0 ? (
                    <div className="space-y-2">
                      {myPendingLogs.map((log) => (
                        <div key={log.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-white">{log.topic_name}</p>
                            <p className="text-[11px] text-slate-400">{log.subject_book} &bull; {log.task_category}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Submitted: {new Date(log.created_at).toLocaleDateString("en-CA")}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-sm font-bold text-white font-mono">{log.quantity} Qty</span>
                            <div>
                              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold uppercase">
                                PENDING
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
                      No submissions currently pending manager approval.
                    </div>
                  )}
                </div>

              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowActiveTasksModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}