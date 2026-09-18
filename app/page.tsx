"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet,
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
  AlertTriangle,
  User,
  Eye,
  Edit3,
  Search,
  Users,
  UserCheck2
} from "lucide-react";

// Helper function: Converts "vishal.sharma@exampur.com" to "Vishal Sharma" cleanly
function formatUserDisplay(email: string | undefined | null) {
  if (!email) return "Employee";
  const prefix = email.split("@")[0];
  return prefix
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function PortalComponent() {
  const router = useRouter();

  // Authentication & Authorization State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"employee" | "admin" | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Active Tasks Modal & Flash Alert State (Employee)
  const [showActiveTasksModal, setShowActiveTasksModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'submissions'>('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [previewModalLog, setPreviewModalLog] = useState<any | null>(null);
  const [flashAlert, setFlashAlert] = useState<{
    show: boolean;
    type: "rejected" | "pending_assigned" | "clean";
    title: string;
    message: string;
  } | null>(null);

  // Real-time Manager Inbound Submission Toast State
  const [managerToast, setManagerToast] = useState<{
    show: boolean;
    employeeEmail: string;
    topic: string;
    quantity: number;
  } | null>(null);

  // Work Logs, Attendance, Profiles & Assignments State
  const [logs, setLogs] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Search States
  const [searchDelegated, setSearchDelegated] = useState("");
  const [searchQueue, setSearchQueue] = useState("");
  const [searchTimesheet, setSearchTimesheet] = useState("");
  const [searchTeam, setSearchTeam] = useState("");

  // Date Filters (Manager View)
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
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

  // Admin Navigation Tabs State (Dashboard cleanup & sidebar integration)
  const [adminView, setAdminView] = useState<'queue' | 'delegated' | 'reports' | 'team' | 'timesheet'>('queue');

  // Profile Map Ref for Realtime Callback Sync
  const profilesRef = useRef<any[]>([]);
  profilesRef.current = profilesList;

  function playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (_) {}
  }

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
      } else {
        setUserRole("employee");
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

    const broadcastChannel = supabase
      .channel("exampur-live-events", {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "new_work_submission" }, (eventPayload: any) => {
        const payloadData = eventPayload.payload;
        fetchLogs();

        setManagerToast({
          show: true,
          employeeEmail: payloadData.employeeEmail || "An Employee",
          topic: payloadData.topic || "Daily Task",
          quantity: payloadData.quantity || 0,
        });

        playNotificationSound();

        setTimeout(() => {
          setManagerToast(null);
        }, 9000);
      })
      .subscribe();

    const logsChannel = supabase
      .channel("realtime-work-logs-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "work_logs" },
        async (payload: any) => {
          fetchLogs();

          const newLog = payload.new;
          if (!newLog) return;

          let empEmail = "Employee";
          const matchedProfile = profilesRef.current.find(
            (p) => String(p.id) === String(newLog.user_id)
          );

          if (matchedProfile?.email) {
            empEmail = matchedProfile.email;
          } else {
            const { data: pData } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", newLog.user_id)
              .single();
            if (pData?.email) empEmail = pData.email;
          }

          setManagerToast({
            show: true,
            employeeEmail: empEmail,
            topic: newLog.topic_name || "Daily Task",
            quantity: newLog.quantity || 0,
          });

          playNotificationSound();

          setTimeout(() => {
            setManagerToast(null);
          }, 9000);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "work_logs" },
        () => fetchLogs()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "work_logs" },
        () => fetchLogs()
      )
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
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, []);

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
      const activeProfiles = data.filter((p: any) => p.role !== "deactivated");
      if (activeProfiles.length > 0 && !assigneeId) {
        setAssigneeId(activeProfiles[0].id);
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

  // Employee Deactivate / Activate Toggle Handler
  async function handleToggleEmployeeStatus(userId: string, email: string, currentRole: string) {
    const isDeactivating = currentRole !== "deactivated";
    const actionName = isDeactivating ? "deactivate" : "activate";

    const confirmText = prompt(
      `WARNING: You are about to ${actionName} employee "${email}".\n\nType 'CONFIRM' in capital letters to proceed:`
    );
    if (confirmText !== "CONFIRM") {
      alert("Action cancelled. Verification text did not match.");
      return;
    }

    try {
      const newRole = isDeactivating ? "deactivated" : "employee";
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw new Error(error.message);

      alert(`Employee "${email}" has been successfully ${isDeactivating ? "deactivated" : "activated"}!`);
      
      await fetchProfiles();
      await fetchLogs();
      await fetchAssignments();
      await fetchAttendance();
    } catch (err: any) {
      alert("Failed to update employee status: " + (err.message || "Permission denied."));
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

  const profileEmailMap = useMemo(() => {
    const map = new Map<string, string>();
    profilesList.forEach((p) => {
      if (p.id && p.role !== "deactivated") {
        map.set(String(p.id), p.email || p.full_name || "Employee");
      }
    });
    if (currentUser) {
      map.set(String(currentUser.id), currentUser.email);
    }
    return map;
  }, [profilesList, currentUser]);

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

  const managerPendingLogs = useMemo(() => {
    return logs.filter((l) => l.status === "pending");
  }, [logs]);

  // 3. Manager On-Load / Pending Review Flash Alert
  useEffect(() => {
    if (userRole !== "admin" || !currentUser) return;

    if (managerPendingLogs.length > 0 && !managerToast) {
      const firstPending = managerPendingLogs[0];
      const submitter = profileEmailMap.get(String(firstPending.user_id)) || "Employee";

      setManagerToast({
        show: true,
        employeeEmail: submitter,
        topic: `${managerPendingLogs.length} Task(s) Pending Review`,
        quantity: firstPending.quantity || 0,
      });

      const timer = setTimeout(() => {
        setManagerToast(null);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [userRole, currentUser, managerPendingLogs.length]);

  // 4. Employee Login Flash Alert
  useEffect(() => {
    if (userRole === "admin" || !currentUser) return;

    if (myRejectedLogs.length > 0) {
      const recentRejected = myRejectedLogs[0];
      setFlashAlert({
        show: true,
        type: "rejected",
        title: `Attention: ${myRejectedLogs.length} Submission(s) Rejected!`,
        message: `"${recentRejected.topic_name}" needs correction. Reason: ${
          recentRejected.manager_remarks || "Please re-check and submit proof again."
        }`,
      });
    } else if (myAssignedTasks.length > 0) {
      setFlashAlert({
        show: true,
        type: "pending_assigned",
        title: `Reminder: ${myAssignedTasks.length} Assigned Task(s) Pending!`,
        message: `You have operational tasks assigned by manager awaiting completion today.`,
      });
    } else if (myPendingLogs.length > 0) {
      setFlashAlert({
        show: true,
        type: "pending_assigned",
        title: `Notice: ${myPendingLogs.length} Task(s) Under Review`,
        message: `Your submitted work logs are currently in the queue for manager verification.`,
      });
    }

    const timer = setTimeout(() => {
      setFlashAlert(null);
    }, 6000);

    return () => clearTimeout(timer);
  }, [userRole, currentUser, myRejectedLogs.length, myAssignedTasks.length, myPendingLogs.length]);

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

  function handleLoadForCorrection(log: any) {
    setDepartment(log.department || "Publications & Testing");
    setTaskCategory(log.task_category || "Question Formation");
    setStage(log.stage || "Proof 1");
    setSubjectBook(log.subject_book || "");
    setTopicName(log.topic_name || "");
    setQuantity(String(log.quantity || ""));
    setPreviewModalLog(null);
    window.scrollTo({ top: 350, behavior: "smooth" });
    alert(`Loaded "${log.topic_name}" into form. Please correct your inputs, attach updated proof, and submit again.`);
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

    try {
      const channel = supabase.channel("exampur-live-events");
      await channel.send({
        type: "broadcast",
        event: "new_work_submission",
        payload: {
          employeeEmail: currentUser?.email,
          topic: topicName.trim(),
          quantity: parsedQty,
        },
      });
    } catch (broadcastErr) {
      console.error("Broadcast notification error:", broadcastErr);
    }

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

  // Manager Create Task Assignment
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

  // Delete/Cancel a single delegated task
  async function handleDeleteSingleAssignment(id: string) {
    if (!confirm("Are you sure you want to delete and cancel this delegated task?")) return;
    const { error } = await supabase.from("task_assignments").delete().eq("id", id);
    if (error) {
      alert("Error deleting task: " + error.message);
    } else {
      fetchAssignments();
    }
  }

  // Master Wipe: Clear all delegated tasks
  async function handleClearAllAssignments() {
    if (!confirm("WARNING: Are you sure you want to permanently delete ALL delegated tasks?")) return;
    const check = prompt("Type 'CLEAR' in capital letters to wipe all delegated tasks:");
    if (check !== "CLEAR") {
      alert("Action cancelled. Verification word did not match.");
      return;
    }

    const { error } = await supabase
      .from("task_assignments")
      .delete()
      .not("id", "is", null);

    if (error) {
      alert("Error clearing assigned tasks: " + error.message);
    } else {
      alert("All delegated tasks have been cleared successfully.");
      fetchAssignments();
    }
  }

  async function updateStatus(logId: string, newStatus: "approved" | "rejected") {
    let remarks = "Approved by Manager";
    if (newStatus === "rejected") {
      const inputRemarks = prompt("Enter specific reason or correction requested for rejection:");
      if (inputRemarks === null) return;
      remarks = inputRemarks.trim() === "" ? "Rejected by Manager (Needs revision)" : inputRemarks;
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
      .gt("id", 0);

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
      if (p.id && !p.id.startsWith("00000000") && p.role !== "deactivated") {
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

  // Filter 1: Currently Delegated Tasks Search
  const filteredAssignments = useMemo(() => {
    if (!searchDelegated.trim()) return assignments;
    const q = searchDelegated.toLowerCase().trim();

    return assignments.filter((a) => {
      const empEmail = (profileEmailMap.get(String(a.assigned_to)) || a.assigned_to || "").toLowerCase();
      const empName = formatUserDisplay(empEmail).toLowerCase();
      const topic = (a.topic_name || "").toLowerCase();
      const book = (a.subject_book || "").toLowerCase();
      const dept = (a.department || "").toLowerCase();
      const cat = (a.task_category || "").toLowerCase();
      const status = (a.status || "").toLowerCase();

      return (
        empEmail.includes(q) ||
        empName.includes(q) ||
        topic.includes(q) ||
        book.includes(q) ||
        dept.includes(q) ||
        cat.includes(q) ||
        status.includes(q)
      );
    });
  }, [assignments, searchDelegated, profileEmailMap]);

  // Filter 2: Queue Filter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchDate = selectedDateFilter 
        ? log.created_at && new Date(log.created_at).toLocaleDateString("en-CA") === selectedDateFilter 
        : true;
      
      if (!matchDate) return false;
      if (!searchQueue.trim()) return true;

      const q = searchQueue.toLowerCase().trim();
      const submitterEmail = (profileEmailMap.get(String(log.user_id)) || "").toLowerCase();
      const submitterName = formatUserDisplay(submitterEmail).toLowerCase();
      const topic = (log.topic_name || "").toLowerCase();
      const book = (log.subject_book || "").toLowerCase();
      const cat = (log.task_category || "").toLowerCase();
      const status = (log.status || "").toLowerCase();

      return (
        submitterName.includes(q) ||
        submitterEmail.includes(q) ||
        topic.includes(q) ||
        book.includes(q) ||
        cat.includes(q) ||
        status.includes(q)
      );
    });
  }, [logs, selectedDateFilter, searchQueue, profileEmailMap]);

  // Filter 3: Master Timesheet Search Filter
  const filteredTimesheetData = useMemo(() => {
    if (!searchTimesheet.trim()) return masterTimesheetData;
    const q = searchTimesheet.toLowerCase().trim();
    return masterTimesheetData.filter((row) => {
      const empName = formatUserDisplay(row.email).toLowerCase();
      const empEmail = row.email.toLowerCase();
      return empName.includes(q) || empEmail.includes(q);
    });
  }, [masterTimesheetData, searchTimesheet]);

  // Filter 4: Team Directory Search Filter (Shows all profiles including deactivated so admin can manage/activate them)
  const filteredTeamProfiles = useMemo(() => {
    if (!searchTeam.trim()) return profilesList;
    const q = searchTeam.toLowerCase().trim();
    return profilesList.filter((p) => {
      const email = (p.email || "").toLowerCase();
      const name = formatUserDisplay(email).toLowerCase();
      const role = (p.role || "employee").toLowerCase();
      return email.includes(q) || name.includes(q) || role.includes(q);
    });
  }, [profilesList, searchTeam]);

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
 
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 flex relative w-full transition-colors duration-300">
      
      {/* Left Sliding Panel / Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E6E2D6] shadow-xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-[#E6E2D6] flex justify-between items-center bg-[#F7F4EB]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="md:hidden text-slate-600 hover:text-slate-900 p-1 rounded-lg bg-slate-200 cursor-pointer"
              title="Close Sidebar"
            >
              ✕
            </button>
            <span className="font-extrabold text-base tracking-wide text-slate-900">Exampur Ops</span>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 text-sm bg-white">
          {userRole === "admin" ? (
            <>
              {/* Admin / Manager Sidebar Links */}
             <button 
      onClick={() => { setAdminView('queue'); setIsSidebarOpen(false); }} 
      className={`w-full text-left px-3 py-2 rounded-lg transition ${adminView === 'queue' ? 'bg-orange-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
    >
      Verification Queue
    </button>
    <button 
      onClick={() => { setAdminView('delegated'); setIsSidebarOpen(false); }} 
      className={`w-full text-left px-3 py-2 rounded-lg transition ${adminView === 'delegated' ? 'bg-orange-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
    >
      Delegated Tasks
    </button>
    <button 
      onClick={() => { setAdminView('reports'); setIsSidebarOpen(false); }} 
      className={`w-full text-left px-3 py-2 rounded-lg transition ${adminView === 'reports' ? 'bg-orange-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
    >
      Reports
    </button>
    <button 
      onClick={() => { setAdminView('team'); setIsSidebarOpen(false); }} 
      className={`w-full text-left px-3 py-2 rounded-lg transition ${adminView === 'team' ? 'bg-orange-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
    >
      Team Directory
    </button>
    <button 
      onClick={() => { setAdminView('timesheet'); setIsSidebarOpen(false); }} 
      className={`w-full text-left px-3 py-2 rounded-lg transition ${adminView === 'timesheet' ? 'bg-orange-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
    >
      Timesheet
    </button>
            </>
          ) : (
            <>
              {/* Employee Sidebar Links with View Switching */}
              <a 
                href="#" 
                onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} 
                className={`block px-3 py-2 rounded-lg transition ${currentView === 'dashboard' ? 'bg-red-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
              >
                Dashboard
              </a>
              <a 
                href="#" 
                onClick={() => { setCurrentView('submissions'); setIsSidebarOpen(false); }} 
                className={`block px-3 py-2 rounded-lg transition ${currentView === 'submissions' ? 'bg-red-600 text-white font-medium' : 'text-slate-700 hover:bg-[#F7F4EB]'}`}
              >
                My Recent Submissions & Done Work
              </a>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 p-6 md:p-10 transition-all duration-300 w-full bg-[#FDFBF7]">
        
        {/* Persistent Sidebar Toggle Button */}
        <div className="mb-6 flex items-center">
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-3.5 py-2 rounded-lg bg-white border border-[#E6E2D6] text-slate-800 hover:bg-[#F7F4EB] text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span className="text-base">☰</span> Toggle Sidebar Panel
          </button>
        </div>

      {/* 1. Smart Login Reminder Flash Toast (Strictly for Employee) */}
      {userRole !== "admin" && flashAlert && flashAlert?.show && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
            flashAlert?.type === "rejected"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}>
            {flashAlert?.type === "rejected" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <BellRing className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
            )}
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-900 mb-0.5">{flashAlert?.title}</p>
              <p className="text-slate-700 leading-relaxed">{flashAlert?.message}</p>
            </div>
            <button
              onClick={() => setFlashAlert(null)}
              className="text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-200/50 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Real-time Inbound Submission Flash Toast (Strictly for Manager) */}
      {userRole === "admin" && managerToast && managerToast?.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="p-5 rounded-2xl shadow-2xl border bg-white border-amber-400 text-slate-900 flex items-start gap-4 backdrop-blur-xl ring-2 ring-amber-400/20">
            <div className="p-3 bg-amber-100 text-amber-700 border border-amber-300 rounded-xl shrink-0 mt-0.5">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                <p className="font-bold text-sm text-amber-800 uppercase tracking-wide">
                  New Submission For Review!
                </p>
              </div>
              <p className="text-slate-900 font-semibold text-xs">
                {formatUserDisplay(managerToast?.employeeEmail)}
              </p>
              <p className="text-cyan-700 font-mono text-[11px] break-all">
                {managerToast?.employeeEmail}
              </p>
              <div className="pt-1 text-slate-700 flex items-center gap-2">
                <span>Status: <b className="text-slate-900">{managerToast?.topic}</b></span>
                {managerToast && managerToast.quantity > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="text-orange-600 font-bold">{managerToast.quantity} Qty</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setManagerToast(null)}
              className="text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 w-full">
        
        {/* Header with Clean Display Name */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E6E2D6] pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded font-mono">EXAMPUR</span>
              Content Operations & Work Audit Portal
            </h1>
            <p className="text-slate-600 text-sm mt-1">Real-time Daily Performance Matrix, Delegation & Verification</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <p className="text-sm text-slate-900 font-bold tracking-wide">
                {formatUserDisplay(currentUser?.email)}
              </p>
              <p className="text-[11px] text-slate-600 font-mono">{currentUser?.email}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase inline-block mt-0.5 ${
                userRole === "admin" ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-blue-100 text-blue-700 border-blue-300"
              }`}>
                {userRole === "admin" ? "Manager (Admin)" : "Employee"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* Dedicated Workspace Identity Badge */}
        <div className="flex items-center gap-2">
          {userRole === "admin" ? (
            <div className="inline-flex items-center gap-2 bg-white border border-purple-200 px-4 py-2 rounded-lg text-xs font-semibold text-purple-700 shadow-sm">
              <TableProperties className="w-4 h-4 text-purple-600" />
              Executive Audit & Delegation Console
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white border border-orange-200 px-4 py-2 rounded-lg text-xs font-semibold text-orange-700 shadow-sm">
              <Send className="w-4 h-4 text-orange-600" />
              Employee Daily Workspace
            </div>
          )}
        </div>

        {/* ================= CONDITIONAL WORKSPACE ROUTING ================= */}
        {userRole !== "admin" ? (
          /* ================= EMPLOYEE VIEW (DASHBOARD vs SUBMISSIONS TAB) ================= */
          currentView === 'dashboard' ? (
            <div className="space-y-8 max-w-4xl mx-auto w-full">
              
              {/* Employee Operational KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setShowActiveTasksModal(true)}
                  className="bg-white hover:bg-[#F7F4EB] border border-[#E6E2D6] hover:border-orange-400 p-4 rounded-xl text-left transition duration-200 cursor-pointer shadow-sm group relative overflow-hidden text-slate-900"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-xs text-orange-600 font-semibold group-hover:text-orange-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> My Active Tasks (Pending/Assigned)
                    </p>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-300">View List &rarr;</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {myAssignedTasks.length + myPendingLogs.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {myAssignedTasks.length} Assigned &bull; {myPendingLogs.length} Under Review
                  </p>
                </button>

                <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm text-slate-900">
                  <p className="text-xs text-emerald-700 font-medium">My Approved Submissions</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-2">
                    {myPersonalLogs.filter(l => l.status === "approved").length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Verified output records</p>
                </div>

                <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm col-span-2 sm:col-span-1 text-slate-900">
                  <p className="text-xs text-blue-700 font-medium">My Total Units Produced</p>
                  <p className="text-2xl font-bold text-blue-700 mt-2">
                    {myPersonalLogs.filter(l => l.status === "approved").reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Cumulative verified count</p>
                </div>
              </div>

              {/* Submission Form */}
              <div className="bg-white border border-[#E6E2D6] rounded-xl p-6 md:p-8 space-y-6 shadow-sm text-slate-900">
                <div className="border-b border-[#E6E2D6] pb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                    <Send className="w-5 h-5 text-orange-600" /> Daily Work Log Submission
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    <span className="text-rose-600 font-semibold">* All fields and proof attachments are strictly mandatory.</span>
                  </p>
                </div>

                <form onSubmit={handleWorkSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-slate-700 block mb-2 font-medium">Department <span className="text-rose-600">*</span></label>
                    <select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer text-slate-900"
                    >
                      <option value="Publications & Testing">Publications & Testing</option>
                      <option value="DTP">DTP</option>
                    </select>
                  </div>

                  {department === "Publications & Testing" && (
                    <div>
                      <label className="text-xs text-slate-700 block mb-2 font-medium">Task Type <span className="text-rose-600">*</span></label>
                      <select
                        required
                        value={taskCategory}
                        onChange={(e) => setTaskCategory(e.target.value)}
                        className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer text-slate-900"
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
                      <label className="text-xs text-slate-700 block mb-2 font-medium">Proofing Stage <span className="text-rose-600">*</span></label>
                      <select
                        required
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-3 text-sm focus:border-orange-500 outline-none cursor-pointer text-slate-900"
                      >
                        <option value="Proof 1">Proof 1</option>
                        <option value="Proof 2">Proof 2</option>
                        <option value="Final Quality Check">Final Quality Check</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-slate-700 font-medium">
                        Subject / Book Name <span className="text-rose-600">*</span>
                      </label>
                      {myRememberedBooks.length > 0 && (
                        <span className="text-[10px] text-orange-600 font-mono">
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
                      className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-3 text-sm focus:border-orange-500 outline-none text-slate-900"
                    />
                    <datalist id="remembered-books">
                      {myRememberedBooks.map((book, idx) => (
                        <option key={idx} value={book} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 block mb-2 font-medium">Topic / Chapter Name <span className="text-rose-600">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Number System Part 1"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-3 text-sm focus:border-orange-500 outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 block mb-2 font-medium">Quantity Completed <span className="text-rose-600">*</span></label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g., 50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-3 text-sm focus:border-orange-500 outline-none text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-700 block mb-2 font-medium">
                      Attach Mandatory Proof (Max 3MB per file, Max 10MB total) <span className="text-rose-600">*</span>
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
                      className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-2.5 text-xs text-slate-700 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? "Uploading Proof & Submitting..." : (completingTaskId ? "Submit Proof & Complete Assigned Task" : "Submit Daily Work Log")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl mx-auto w-full">
              {/* Employee Submissions View accessed via Sidebar */}
              <div className="bg-white border border-[#E6E2D6] rounded-xl p-6 space-y-4 shadow-sm text-slate-900">
                <div className="flex justify-between items-center border-b border-[#E6E2D6] pb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <History className="w-4 h-4 text-orange-600" /> My Recent Submissions & Done Work
                  </h3>
                  <span className="text-[11px] text-slate-500">Click Eye icon to preview files or re-submit correction</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-[#F7F4EB] text-slate-700 uppercase text-[10px] tracking-wider border-b border-[#E6E2D6]">
                      <tr>
                        <th className="p-3">Topic / Subject</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3">Proof</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Preview / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2D6]">
                      {myPersonalLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-[#F7F4EB]/50">
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{l.topic_name}</div>
                            <div className="text-[10px] text-slate-500">{l.subject_book}</div>
                          </td>
                          <td className="p-3">
                            <div>{l.task_category}</div>
                            {l.stage && <div className="text-[10px] text-slate-500">{l.stage}</div>}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">{l.quantity}</td>
                          <td className="p-3">
                            {parseAttachmentUrls(l.attachment_url).map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 mr-2">
                                Proof {i + 1} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              l.status === "approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                              l.status === "rejected" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                              "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}>
                              {l.status || "pending"}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setPreviewModalLog(l)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 text-[11px] font-medium transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" /> Preview
                            </button>
                            {l.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => handleLoadForCorrection(l)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-600 text-amber-900 hover:text-white rounded border border-amber-300 text-[11px] font-medium transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Fix / Re-submit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {myPersonalLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">No submissions logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        ) : (
          /* ================= MANAGER MASTER DASHBOARD ================= */
        
          /* ================= MANAGER ADMIN VIEW WITH TABS ================= */
          <div className="space-y-8">
            
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm text-slate-900">
                <p className="text-xs text-slate-600 font-medium">Total Entries</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summaryMetrics.totalCount}</p>
              </div>
              <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm text-slate-900">
                <p className="text-xs text-emerald-700 font-medium">Approved</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{summaryMetrics.approvedCount}</p>
              </div>
              <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm text-slate-900">
                <p className="text-xs text-amber-700 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{summaryMetrics.pendingCount}</p>
              </div>
              <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm text-slate-900">
                <p className="text-xs text-rose-700 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{summaryMetrics.rejectedCount}</p>
              </div>
              <div className="bg-white border border-[#E6E2D6] p-4 rounded-xl shadow-sm col-span-2 md:col-span-1 text-slate-900">
                <p className="text-xs text-orange-600 font-medium">Approved Output</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{summaryMetrics.totalUnitsProduced}</p>
              </div>
            </div>

            {/* TAB 1: VERIFICATION QUEUE */}
            {adminView === 'queue' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E6E2D6] rounded-xl p-5 space-y-4 shadow-sm text-slate-900">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                    Verification Queue ({filteredLogs.length})
                  </h3>
                  <div className="overflow-y-auto max-h-96 border border-[#E6E2D6] rounded-lg">
                    <table className="w-full text-left text-xs text-slate-800 border-collapse">
                      <thead className="bg-[#F7F4EB] text-slate-700 uppercase text-[10px] tracking-wider sticky top-0">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Topic / Subject & Submitter</th>
                          <th className="p-3 text-center">Quantity</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E2D6]">
                        {filteredLogs.map((l) => (
                          <tr key={l.id} className="hover:bg-[#F7F4EB]/50">
                            <td className="p-3 font-mono">{l.created_at?.slice(0, 10)}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">{l.topic_name}</div>
                              <div className="text-[11px] text-slate-500">{profileEmailMap.get(String(l.user_id))}</div>
                            </td>
                            <td className="p-3 text-center font-bold">{l.quantity}</td>
                            <td className="p-3 uppercase font-bold text-[10px]">{l.status}</td>
                            <td className="p-3 text-right space-x-2">
                              <button onClick={() => updateStatus(l.id, "approved")} className="bg-emerald-600 text-white px-2.5 py-1 rounded cursor-pointer">Approve</button>
                              <button onClick={() => updateStatus(l.id, "rejected")} className="bg-rose-600 text-white px-2.5 py-1 rounded cursor-pointer">Reject</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DELEGATED TASKS */}
            {adminView === 'delegated' && (
              <div className="bg-white border border-[#E6E2D6] rounded-xl p-6 space-y-6 shadow-sm text-slate-900">
                <h3 className="text-sm font-semibold text-slate-900">Delegated Tasks Management</h3>
                <form onSubmit={handleAssignTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">Assign To *</label>
                    <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-2.5">
                      {profilesList.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">Target Qty *</label>
                    <input type="number" required value={assignQty} onChange={(e) => setAssignQty(e.target.value)} className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-2.5" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">Book *</label>
                    <input type="text" required value={assignSubject} onChange={(e) => setAssignSubject(e.target.value)} className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-2.5" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">Topic *</label>
                    <input type="text" required value={assignTopic} onChange={(e) => setAssignTopic(e.target.value)} className="w-full bg-[#FDFBF7] border border-[#E6E2D6] rounded-lg p-2.5" />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Assign Task</button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: REPORTS */}
            {adminView === 'reports' && (
              <div className="bg-white border border-[#E6E2D6] rounded-xl p-6 space-y-4 shadow-sm text-slate-900">
                <h3 className="text-sm font-semibold text-slate-900">Reports</h3>
                <p className="text-xs text-slate-500">Advanced Operations Reporting</p>
                <button onClick={() => alert("Report downloaded successfully!")} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  Download Sheet
                </button>
              </div>
            )}

            {/* TAB 4: TEAM DIRECTORY */}
            {adminView === 'team' && (
              <div className="bg-white border border-[#E6E2D6] rounded-xl p-5 space-y-4 shadow-sm text-slate-900">
                <h3 className="text-sm font-semibold text-slate-900">Team Directory ({filteredTeamProfiles.length})</h3>
                <div className="overflow-y-auto max-h-72 border border-[#E6E2D6] rounded-lg">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-[#F7F4EB] text-slate-700 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2D6]">
                      {filteredTeamProfiles.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 font-semibold">{formatUserDisplay(p.email)}</td>
                          <td className="p-3 font-mono">{p.email}</td>
                          <td className="p-3 uppercase font-bold">{p.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: TIMESHEET */}
            {adminView === 'timesheet' && (
              <div className="bg-white border border-[#E6E2D6] rounded-xl p-5 space-y-4 shadow-sm text-slate-900">
                <h3 className="text-sm font-semibold text-slate-900">Timesheet</h3>
                <div className="overflow-x-auto max-h-96 border border-[#E6E2D6] rounded-lg">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-[#F7F4EB] text-slate-700 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 sticky left-0 bg-[#F7F4EB]">Employee</th>
                        <th className="p-2.5 text-center">Total</th>
                        {monthDays.map(d => <th key={d} className="p-2 text-center">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2D6]">
                      {filteredTimesheetData.map(row => (
                        <tr key={row.userId}>
                          <td className="p-2.5 sticky left-0 bg-white font-semibold">{formatUserDisplay(row.email)}</td>
                          <td className="p-2.5 text-center font-bold text-orange-600">{row.monthTotalUnits}</td>
                          {monthDays.map(d => (
                            <td key={d} className="p-2 text-center font-mono">{row.dailyUnits[d] || "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
        {userRole !== "admin" && showActiveTasksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-[#E6E2D6] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
              
              <div className="p-5 border-b border-[#E6E2D6] flex justify-between items-center bg-[#F7F4EB]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Active Tasks Overview</h3>
                    <p className="text-xs text-slate-500">Assigned delegation & pending verification logs</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActiveTasksModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
        
              <div className="p-6 overflow-y-auto space-y-6 bg-[#FDFBF7]">
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Delegated By Manager ({myAssignedTasks.length})
                    </h4>
                    <span className="text-[10px] text-slate-500">Awaiting your completion</span>
                  </div>

                  {myAssignedTasks.length > 0 ? (
                    <div className="space-y-2.5">
                      {myAssignedTasks.map((task) => (
                        <div key={task.id} className="bg-white border border-[#E6E2D6] hover:border-orange-400 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-900">{task.topic_name}</span>
                              <span className="text-[10px] bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded font-mono">
                                Target: {task.target_quantity} Units
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Book: <span className="text-slate-900 font-medium">{task.subject_book}</span> &bull; {task.task_category}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectTaskToWork(task)}
                            className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Work on this Task
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white border border-[#E6E2D6] rounded-xl text-center text-xs text-slate-500 shadow-sm">
                      No delegated tasks assigned by manager right now.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Manager Review ({myPendingLogs.length})
                    </h4>
                    <span className="text-[10px] text-slate-500">Submitted & awaiting verification</span>
                  </div>

                  {myPendingLogs.length > 0 ? (
                    <div className="space-y-2">
                      {myPendingLogs.map((log) => (
                        <div key={log.id} className="bg-white border border-[#E6E2D6] p-3.5 rounded-xl flex justify-between items-center text-xs shadow-sm">
                          <div>
                            <p className="font-semibold text-slate-900">{log.topic_name}</p>
                            <p className="text-[11px] text-slate-600">{log.subject_book} &bull; {log.task_category}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Submitted: {new Date(log.created_at).toLocaleDateString("en-CA")}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-sm font-bold text-slate-900 font-mono">{log.quantity} Qty</span>
                            <div>
                              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold uppercase">
                                PENDING
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white border border-[#E6E2D6] rounded-xl text-center text-xs text-slate-500 shadow-sm">
                      No submissions currently pending manager approval.
                    </div>
                  )}
                </div>

              </div>

              <div className="p-4 border-t border-[#E6E2D6] bg-[#F7F4EB] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowActiveTasksModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}
        {previewModalLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Submission Work Details</h3>
                    <p className="text-[11px] text-slate-400">Review task details, remarks & proof attachments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalLog(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-mono">Submission Date</span>
                    <span className="font-semibold text-white">
                      {previewModalLog.created_at ? new Date(previewModalLog.created_at).toLocaleDateString("en-CA") : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      previewModalLog.status === "approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                      previewModalLog.status === "rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                      "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}>
                      {previewModalLog.status || "pending"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">Topic / Chapter</span>
                    <p className="text-white font-bold text-sm mt-0.5">{previewModalLog.topic_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">Subject / Book</span>
                    <p className="text-slate-200 font-medium mt-0.5">{previewModalLog.subject_book}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">Department & Category</span>
                    <p className="text-slate-300 mt-0.5">{previewModalLog.department} &bull; {previewModalLog.task_category}</p>
                    {previewModalLog.stage && (
                      <span className="text-[10px] text-orange-400 font-mono">Stage: {previewModalLog.stage}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">Completed Quantity</span>
                    <p className="text-orange-400 font-bold text-base mt-0.5">{previewModalLog.quantity} Units</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  previewModalLog.status === "rejected"
                    ? "bg-rose-950/30 border-rose-800/70 text-rose-200"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Manager Remarks / Feedback:
                  </span>
                  <p className="text-xs leading-relaxed font-sans">
                    {previewModalLog.manager_remarks || "No specific comments recorded yet."}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium text-xs block mb-2">
                    Submitted Proof Attachments:
                  </span>
                  <div className="space-y-2">
                    {parseAttachmentUrls(previewModalLog.attachment_url).map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl transition group text-slate-300 hover:text-white"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
                          <span className="font-mono text-xs">Proof Document #{idx + 1}</span>
                        </div>
                        <span className="text-[11px] text-blue-400 group-hover:underline flex items-center gap-1 font-semibold">
                          Open File <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    ))}
                    {parseAttachmentUrls(previewModalLog.attachment_url).length === 0 && (
                      <p className="text-slate-500 text-xs italic">No attachment URL saved.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center gap-3">
                {previewModalLog.status !== "approved" ? (
                  <button
                    type="button"
                    onClick={() => handleLoadForCorrection(previewModalLog)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Load for Correction & Re-submit
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-medium">Task Verified & Approved</span>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewModalLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
    </div>
  );
}

// Advanced Reporting Component for Excel/CSV Sheet Exports (Daily, Monthly & Custom Date Range)
function ReportingSection({ submissions }: { submissions: any[] }) {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('daily');
  const [singleDate, setSingleDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const downloadCSV = (dataToExport: any[], filename: string) => {
    if (dataToExport.length === 0) {
      alert('No records found for the selected reporting criteria.');
      return;
    }

    const headers = ['Date', 'Employee Name', 'Workspace Email', 'Topic / Subject', 'Category', 'Quantity', 'Status'];
    const rows = dataToExport.map(item => [
      item.date || '',
      `"${item.employeeName || ''}"`,
      item.employeeEmail || '',
      `"${item.topic || ''}"`,
      `"${item.category || ''}"`,
      item.quantity || 0,
      item.status || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReport = () => {
    let filtered = [...submissions];

    if (reportType === 'daily') {
      if (!singleDate) {
        alert('Please select a target date for the daily report.');
        return;
      }
      filtered = filtered.filter(item => item.date === singleDate);
      downloadCSV(filtered, `Daily_Report_${singleDate}`);
    } 
    else if (reportType === 'monthly') {
      if (!selectedMonth) {
        alert('Please select a target month (YYYY-MM).');
        return;
      }
      filtered = filtered.filter(item => item.date && item.date.startsWith(selectedMonth));
      downloadCSV(filtered, `Monthly_Report_${selectedMonth}`);
    } 
    else if (reportType === 'custom') {
      if (!fromDate || !toDate) {
        alert('Please select both From and To dates.');
        return;
      }
      filtered = filtered.filter(item => item.date >= fromDate && item.date <= toDate);
      downloadCSV(filtered, `Custom_Range_Report_${fromDate}_to_${toDate}`);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/20 text-orange-500 rounded-lg">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Advanced Operations Reporting (Daily, Monthly & Custom Sheets)</h3>
          <p className="text-xs text-slate-400">Generate and download official CSV sheets for management review.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="daily">Daily Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="custom">Custom From-To Date</option>
          </select>
        </div>

        {reportType === 'daily' && (
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Date *</label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Month *</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        )}

        {reportType === 'custom' && (
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Date *</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To Date *</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        )}

        <div>
         <button
            type="button"
            onClick={handleGenerateReport}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs py-2.5 px-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download Sheet
          </button>
        </div>
      </div>
    </div>
  );
}