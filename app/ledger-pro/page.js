import React, { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  CreditCard,
  TrendingUp,
  Bell,
  Search,
  Plus,
  Trash2,
  Edit,
  FileText,
  DollarSign,
  Calendar,
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  AlertCircle,
  Menu,
  X,
  Printer,
  Sliders,
  ChevronRight,
  Shield,
  HelpCircle,
  Settings as SettingsIcon,
  Filter
} from "lucide-react";

// Initial Mock Data
const initialStudents = [
  { id: "STU-1001", name: "Aarav Sharma", class: "Grade 10", section: "A", rollNo: "01", status: "Active", feeStatus: "Paid", parent: "Rajesh Sharma", contact: "+977 9801234567" },
  { id: "STU-1002", name: "Bipasha Adhikari", class: "Grade 10", section: "A", rollNo: "02", status: "Active", feeStatus: "Pending", parent: "Sunil Adhikari", contact: "+977 9802345678" },
  { id: "STU-1003", name: "Chhitiz Shrestha", class: "Grade 9", section: "B", rollNo: "05", status: "Active", feeStatus: "Paid", parent: "Ramesh Shrestha", contact: "+977 9803456789" },
  { id: "STU-1004", name: "Dristi Karki", class: "Grade 8", section: "A", rollNo: "12", status: "Inactive", feeStatus: "Overdue", parent: "Binod Karki", contact: "+977 9804567890" },
  { id: "STU-1005", name: "Elina Gurung", class: "Grade 10", section: "B", rollNo: "08", status: "Active", feeStatus: "Paid", parent: "Tek Bahadur Gurung", contact: "+977 9805678901" }
];

const initialStaff = [
  { id: "TCH-01", name: "Subash Thapa", designation: "Senior Mathematics Teacher", department: "Science & Math", phone: "+977 9811111111", email: "subash.thapa@school.edu.np", status: "Active" },
  { id: "TCH-02", name: "Prashna Bista", designation: "English Faculty Head", department: "Languages", phone: "+977 9822222222", email: "prashna.b@school.edu.np", status: "Active" },
  { id: "TCH-03", name: "Deepak Dahal", designation: "Physics Lecturer", department: "Science", phone: "+977 9833333333", email: "deepak.dahal@school.edu.np", status: "Active" },
  { id: "TCH-04", name: "Saraswati Paudel", designation: "Computer Science Teacher", department: "IT & Tech", phone: "+977 9844444444", email: "saraswati.p@school.edu.np", status: "On Leave" }
];

const initialNotices = [
  { id: 1, title: "Second Terminal Examination Schedule Announced", date: "2026-10-20", category: "Exams", target: "All Students", priority: "High", content: "The 2nd terminal examinations will commence from November 10. Admit cards will be issued next week." },
  { id: 2, title: "Monthly Fee Due Date Reminder", date: "2026-10-18", category: "Fees", target: "Parents", priority: "Medium", content: "Parents are requested to clear all pending monthly dues prior to the examination card issuance." },
  { id: 3, title: "Annual Sports Week Registration Open", date: "2026-10-15", category: "General", target: "Grades 5-10", priority: "Low", content: "Students interested in participating in track & field events can register with the Sports Department." }
];

const initialTransactions = [
  { id: "TXN-9081", student: "Aarav Sharma", amount: "Rs. 12,500", date: "2026-10-25", type: "Monthly Tuition Fee", status: "Completed" },
  { id: "TXN-9082", student: "Elina Gurung", amount: "Rs. 8,200", date: "2026-10-24", type: "Bus & Lunch Fee", status: "Completed" },
  { id: "TXN-9083", student: "Chhitiz Shrestha", amount: "Rs. 15,000", date: "2026-10-22", type: "Exam & Lab Fee", status: "Completed" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("United English Boarding School");

  // State Management
  const [students, setStudents] = useState(initialStudents);
  const [staff, setStaff] = useState(initialStaff);
  const [notices, setNotices] = useState(initialNotices);
  const [transactions, setTransactions] = useState(initialTransactions);

  // Modals & Forms State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filters & Search
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("All");

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: "",
    class: "Grade 10",
    section: "A",
    rollNo: "",
    parent: "",
    contact: "",
    status: "Active",
    feeStatus: "Pending"
  });

  // New Notice Form State
  const [newNotice, setNewNotice] = useState({
    title: "",
    category: "General",
    target: "All",
    priority: "Medium",
    content: ""
  });

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      const matchesSearch = stu.name.toLowerCase().includes(studentSearch.toLowerCase()) || stu.id.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = studentClassFilter === "All" || stu.class === studentClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, studentSearch, studentClassFilter]);

  // Handle Add Student
  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.rollNo) return;
    const created = {
      ...newStudent,
      id: `STU-${1000 + students.length + 1}`
    };
    setStudents([created, ...students]);
    setIsAddStudentOpen(false);
    setNewStudent({ name: "", class: "Grade 10", section: "A", rollNo: "", parent: "", contact: "", status: "Active", feeStatus: "Pending" });
  };

  // Handle Add Notice
  const handleAddNotice = (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;
    const noticeObj = {
      ...newNotice,
      id: Date.now(),
      date: new Date().toISOString().split("T")[0]
    };
    setNotices([noticeObj, ...notices]);
    setIsNoticeModalOpen(false);
    setNewNotice({ title: "", category: "General", target: "All", priority: "Medium", content: "" });
  };

  // Open Invoice Preview
  const handleOpenInvoice = (stu) => {
    setSelectedInvoice(stu);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30">
              UE
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide leading-tight line-clamp-1">{schoolName}</h1>
              <p className="text-xs text-slate-400">Admin Portal v2.4</p>
            </div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: TrendingUp },
            { id: "students", label: "Student Management", icon: Users },
            { id: "finance", label: "Fee & Accounting", icon: CreditCard },
            { id: "notices", label: "Notice Board", icon: Bell },
            { id: "staff", label: "Teacher & Staff", icon: BookOpen },
            { id: "settings", label: "Settings", icon: SettingsIcon }
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-indigo-300">
              AD
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-slate-200">Administrator</p>
              <p className="text-slate-500">admin@school.edu.np</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab === "finance" ? "Fee & Accounting" : activeTab}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search portal..."
                className="bg-transparent text-xs text-slate-700 focus:outline-none w-40"
              />
            </div>
            <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="text-right hidden md:block">
              <span className="block text-xs font-semibold text-slate-700">Academic Year</span>
              <span className="block text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                2081/2082 BS
              </span>
            </div>
          </div>
        </header>

        {/* View Routing */}
        <main className="p-4 md:p-8 flex-1 overflow-y-auto">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total Students</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">1,248</h3>
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
                      <TrendingUp size={12} className="mr-1" /> +4.2% from last term
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users size={24} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total Faculty & Staff</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">68</h3>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1">45 Full-time teachers</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserCheck size={24} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Fee Collected (This Month)</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">Rs. 8.45M</h3>
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
                      <TrendingUp size={12} className="mr-1" /> 88% targets met
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <CreditCard size={24} />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Attendance Rate Today</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">94.6%</h3>
                    <span className="text-[11px] text-slate-500 font-medium block mt-1">1,180 Present</span>
                  </div>
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                    <Award size={24} />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Exam Schedule */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Notice & Announcements */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Bell size={18} className="text-indigo-600" /> Recent Notice & Announcements
                    </h3>
                    <button
                      onClick={() => setActiveTab("notices")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {notices.slice(0, 3).map((notice) => (
                      <div key={notice.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                            {notice.category}
                          </span>
                          <span className="text-xs text-slate-400">{notice.date}</span>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-sm mb-1">{notice.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{notice.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-indigo-600" /> Upcoming Exams & Events
                  </h3>
                  <div className="space-y-3 flex-1">
                    {[
                      { title: "Science Lab Practical", class: "Grade 9 & 10", time: "Tomorrow, 10:00 AM" },
                      { title: "Monthly Parent Teacher Meeting", class: "All Grades", time: "Oct 30, 2026" },
                      { title: "2nd Terminal Examinations", class: "Nursery - Grade 10", time: "Nov 10, 2026" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-600"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.title}</p>
                          <p className="text-[11px] text-slate-500">{item.class}</p>
                          <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {item.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsNoticeModalOpen(true)}
                    className="mt-4 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus size={16} /> <span>Create New Notice</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT MANAGEMENT TAB */}
          {activeTab === "students" && (
            <div className="space-y-6">
              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter size={16} className="text-slate-400" />
                    <select
                      value={studentClassFilter}
                      onChange={(e) => setStudentClassFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
                    >
                      <option value="All">All Classes</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20"
                >
                  <Plus size={16} /> <span>Add New Student</span>
                </button>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-4">Student ID</th>
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Class & Sec</th>
                        <th className="p-4">Roll No</th>
                        <th className="p-4">Parent/Guardian</th>
                        <th className="p-4">Fee Status</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-mono font-medium text-slate-900">{student.id}</td>
                            <td className="p-4 font-bold text-slate-800">{student.name}</td>
                            <td className="p-4">
                              <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">
                                {student.class} ({student.section})
                              </span>
                            </td>
                            <td className="p-4 font-semibold">{student.rollNo}</td>
                            <td className="p-4">
                              <div>{student.parent}</div>
                              <div className="text-[10px] text-slate-400">{student.contact}</div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  student.feeStatus === "Paid"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : student.feeStatus === "Pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {student.feeStatus}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                  student.status === "Active" ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              ></span>
                              {student.status}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenInvoice(student)}
                                className="p-1.5 hover:bg-slate-100 rounded text-indigo-600"
                                title="View Bill"
                              >
                                <FileText size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-slate-400">
                            No student records found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* FEE & FINANCIAL ACCOUNTING TAB */}
          {activeTab === "finance" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl shadow-lg shadow-indigo-500/20">
                  <p className="text-xs text-indigo-200 font-medium">Total Collected (This Term)</p>
                  <h3 className="text-3xl font-extrabold mt-2">Rs. 2,450,000</h3>
                  <div className="mt-4 pt-4 border-t border-indigo-500/40 text-xs text-indigo-100 flex justify-between">
                    <span>Target: Rs. 3,000,000</span>
                    <span className="font-bold">81.6%</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium">Pending Dues</p>
                  <h3 className="text-3xl font-bold text-rose-600 mt-2">Rs. 550,000</h3>
                  <p className="text-xs text-slate-400 mt-2">Affecting 42 Students</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium">Scholarships Disbursed</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-2">Rs. 180,000</h3>
                  <p className="text-xs text-slate-400 mt-2">15 Merit Scholarships</p>
                </div>
              </div>

              {/* Transactions Log */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Recent Fee Transactions Log</h3>
                <div className="space-y-3">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{txn.student}</p>
                          <p className="text-[10px] text-slate-400">{txn.type} • {txn.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900">{txn.amount}</span>
                        <span className="block text-[10px] text-emerald-600 font-semibold">{txn.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NOTICE BOARD TAB */}
          {activeTab === "notices" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm">Official Notice Board & Announcements</h3>
                <button
                  onClick={() => setIsNoticeModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2"
                >
                  <Plus size={16} /> <span>Post Notice</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notices.map((notice) => (
                  <div key={notice.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {notice.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{notice.date}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mb-2">{notice.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">{notice.content}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                      <span>Target: <strong>{notice.target}</strong></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        notice.priority === "High" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {notice.priority} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAFF & TEACHER TAB */}
          {activeTab === "staff" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member) => (
                  <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-indigo-500/20 flex items-center justify-center font-bold text-indigo-600 text-xl mb-3">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{member.name}</h4>
                    <p className="text-xs text-indigo-600 font-medium mb-1">{member.designation}</p>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] mb-4">
                      {member.department}
                    </span>
                    <div className="w-full pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1 text-left">
                      <p className="flex justify-between"><span>Phone:</span> <strong className="text-slate-700">{member.phone}</strong></p>
                      <p className="flex justify-between"><span>Email:</span> <strong className="text-slate-700 line-clamp-1">{member.email}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
              <h3 className="font-bold text-slate-800 text-sm mb-4">School System Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year Session</label>
                  <input
                    type="text"
                    defaultValue="2081/2082 BS"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="pt-4">
                  <button className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADD NEW STUDENT */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Register New Student</h3>
              <button onClick={() => setIsAddStudentOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suman Karki"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={newStudent.class}
                    onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5"
                  >
                    <option>Grade 8</option>
                    <option>Grade 9</option>
                    <option>Grade 10</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Roll No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14"
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hari Karki"
                  value={newStudent.parent}
                  onChange={(e) => setNewStudent({ ...newStudent, parent: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+977 98XXXXXXXX"
                  value={newStudent.contact}
                  onChange={(e) => setNewStudent({ ...newStudent, contact: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-md">
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POST NOTICE */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Post New Notice</h3>
              <button onClick={() => setIsNoticeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddNotice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Fair Announcement"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5"
                  >
                    <option>Exams</option>
                    <option>Fees</option>
                    <option>General</option>
                    <option>Canteen</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Content / Message *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Write the full notice body here..."
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-md">
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE PREVIEW */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 text-xs">
            <div className="text-center border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-slate-900 text-base">{schoolName}</h3>
              <p className="text-[10px] text-slate-400">Official Fee Receipt / Statement</p>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between"><span className="text-slate-500">Student ID:</span><span className="font-mono font-bold">{selectedInvoice.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Student Name:</span><span className="font-bold">{selectedInvoice.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Class:</span><span>{selectedInvoice.class}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Fee Status:</span><span className="font-bold text-emerald-600">{selectedInvoice.feeStatus}</span></div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 space-y-1">
              <div className="flex justify-between"><span>Tuition Fee</span><span>Rs. 8,000</span></div>
              <div className="flex justify-between"><span>Exam & Lab Fee</span><span>Rs. 2,000</span></div>
              <div className="flex justify-between font-bold pt-2 border-t border-slate-200 text-slate-900">
                <span>Total Due</span><span>Rs. 10,000</span>
              </div>
            </div>
            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
