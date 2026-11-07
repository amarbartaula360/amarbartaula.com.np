"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Users, Landmark, TrendingUp, Search, Plus, FileSpreadsheet, LayoutDashboard, HandCoins, BookOpen, BarChart3, Bell, Settings, Download, Upload, ChevronRight, Menu, X } from "lucide-react";
import FinanceWorkspace from "../components/FinanceWorkspace";
import NepaliDate from "nepali-date-converter";

const initialMembers = [];

const navItems = [
  ["Overview", "ड्यासबोर्ड", LayoutDashboard],
  ["Members", "सदस्यहरू", Users],
  ["Deposits", "मासिक बचत", Wallet],
  ["Finance", "Voucher तथा ऋण", BookOpen],
  ["Import", "Excel Import", FileSpreadsheet],
  ["Reports", "प्रतिवेदन", BarChart3],
  ["Ledger", "सदस्य Ledger", BookOpen],
];

const money = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const toBsDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new NepaliDate(new Date(year, month - 1, day, 12)).format("YYYY-MM-DD").replace(/\d/g, digit => "०१२३४५६७८९"[Number(digit)]);
};
const bsToAdDate = (value) => {
  if (!value) return "";
  const date = new NepaliDate(String(value).trim()).toJsDate();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error("वि.सं. मिति YYYY-MM-DD ढाँचामा सही राख्नुहोस्।");
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
};
const reportConfigs = {
  loanPortfolio: { label:"ऋण लगानी तथा बाँकी साँवा/ब्याज", columns:[["member_code","सदस्य नं."],["full_name","सदस्य"],["application_no","ऋण नं."],["disbursed_amount","वितरित रकम"],["principal_outstanding","बाँकी साँवा"],["interest_outstanding","बाँकी ब्याज"],["principal_paid","तिरेको साँवा"],["interest_paid","तिरेको ब्याज"]] },
  loanPayments: { label:"ऋण किस्ता तथा ब्याज आम्दानी", columns:[["paid_on","भुक्तानी मिति"],["member_code","सदस्य नं."],["full_name","सदस्य"],["receipt_no","रसिद नं."],["principal_amount","साँवा"],["interest_amount","ब्याज आम्दानी"],["fee_amount","शुल्क/जरिवाना"],["payment_method","माध्यम"]] },
  savingsByPeriod: { label:"मासिक बचत प्रतिवेदन", columns:[["period_year","वि.सं. वर्ष"],["period_month","महिना नं."],["member_count","जम्मा गर्ने सदस्य"],["amount","कुल बचत"]] },
  cashBank: { label:"नगद तथा बैंक मौज्दात", columns:[["account_name","खाता"],["account_type","प्रकार"],["opening_balance","सुरु मौज्दात"],["total_in","जम्मा आएको"],["total_out","जम्मा गएको"],["balance","अन्तिम मौज्दात"]] },
  vouchers: { label:"Voucher प्रतिवेदन", columns:[["voucher_date","मिति"],["voucher_no","Voucher नं."],["voucher_type","प्रकार"],["narration","विवरण"],["debit","Debit"],["credit","Credit"],["status","स्थिति"]] },
  memberSavings: { label:"सदस्यगत बचत तथा Current Deposit", columns:[["member_code","सदस्य नं."],["full_name","सदस्यको नाम"],["deposit_count","जम्मा पटक"],["total_savings","छानिएको अवधिको बचत"],["current_deposit","Current Deposit (हाल कायम बचत)"]] },
  annualSavings: { label:"वार्षिक कोष विवरण", columns:[["period_year","वि.सं. वर्ष"],["member_count","सदस्य संख्या"],["deposit_count","जम्मा संख्या"],["total_savings","वार्षिक बचत"]] },
  incomeStatement: { label:"आम्दानी तथा खर्च", columns:[["account_code","खाता कोड"],["account_name","खाताको नाम"],["account_type","प्रकार"],["net_amount","कुल रकम"]] },
  accountingLedger: { label:"Accounting Ledger", columns:[["voucher_date","मिति (वि.सं.)"],["account_code","खाता कोड"],["account_name","खाताको नाम"],["voucher_no","Voucher नं."],["voucher_type","प्रकार"],["narration","विवरण"],["opening_balance","सुरु बाँकी"],["debit","Debit"],["credit","Credit"],["running_balance","चल्ती Balance"]] },
  trialBalance: { label:"Trial Balance (परीक्षण सन्तुलन)", columns:[["account_code","खाता कोड"],["account_name","खाताको नाम"],["account_type","खाता प्रकार"],["total_debit","कुल Debit"],["total_credit","कुल Credit"],["debit_balance","Debit Balance"],["credit_balance","Credit Balance"]] },
  balanceSheet: { label:"Balance Sheet (वासलात)", columns:[["account_code","खाता कोड"],["account_name","खाताको नाम"],["account_type","खाता प्रकार"],["balance","मौज्दात"]] }
};

export default function BhalaiKoshPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    fetch("/api/bhalai-kosh/auth/me").then(r => {
      if (!r.ok) { router.replace("/bhalaikosh"); return null; }
      return r.json();
    }).then(data => { if (data?.authenticated) setAuthReady(true); }).catch(() => router.replace("/bhalaikosh"));
  }, [router]);
  const [active, setActive] = useState("Overview");
  const [financeTab, setFinanceTab] = useState("journal");
  const [members, setMembers] = useState(initialMembers);
  const [savingMembers, setSavingMembers] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({});
  const [memberBusy, setMemberBusy] = useState(false);
  const [initialImportBusy, setInitialImportBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newId, setNewId] = useState("");
  const [notice, setNotice] = useState("Database बाट सदस्य विवरण लोड हुँदैछ।");
  const [depositYear, setDepositYear] = useState("2082");
  const [depositMonth, setDepositMonth] = useState("1");
  const [contributions, setContributions] = useState([]);
  const [depositAmounts, setDepositAmounts] = useState({});
  const [depositDates, setDepositDates] = useState({});
  const [depositMethods, setDepositMethods] = useState({});
  const [depositLoading, setDepositLoading] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState(null);
  const [annualRows, setAnnualRows] = useState([]);
  const [ledgerMemberId, setLedgerMemberId] = useState("");
  const [ledgerFromBs, setLedgerFromBs] = useState("2081-07-01");
  const [ledgerToBs, setLedgerToBs] = useState("");
  const [ledgerAppliedFromBs, setLedgerAppliedFromBs] = useState("2081-07-01");
  const [ledgerAppliedToBs, setLedgerAppliedToBs] = useState("");
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerEditRow,setLedgerEditRow]=useState(null);
  const [ledgerEditForm,setLedgerEditForm]=useState({});
  const [ledgerEditBusy,setLedgerEditBusy]=useState(false);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [reportFromBs, setReportFromBs] = useState("2081-07-01");
  const [reportToBs, setReportToBs] = useState("");
  const [reportType, setReportType] = useState("loanPortfolio");
  const [accountingAccountId, setAccountingAccountId] = useState("all");
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const nepaliMonths = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कात्तिक","मंसिर","पुस","माघ","फागुन","चैत"];
  const loadMonthlyContributions = async () => {
    setDepositLoading(true);
    try {
      const r = await fetch("/api/bhalai-kosh/contributions?year="+depositYear+"&month="+depositMonth);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "मासिक बचत विवरण ल्याउन सकिएन।");
      setContributions(d.contributions || []);
    } catch (e) { setNotice(e.message); }
    finally { setDepositLoading(false); }
  };
  useEffect(() => {
    if (authReady && active === "Deposits") loadMonthlyContributions();
  }, [authReady, active, depositYear, depositMonth]);
  const deleteContribution = async (saving) => {
    if (!window.confirm(saving.full_name + " को रु. " + money(saving.amount) + " बचत हटाउने हो? सम्बन्धित Voucher reverse हुनेछ र सदस्य Ledger बाट रकम हट्नेछ।")) return;
    setSavingMemberId(Number(saving.member_id));
    try {
      const r = await fetch("/api/bhalai-kosh/contributions?id=" + encodeURIComponent(saving.id), {method:"DELETE"});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "बचत रद्द गर्न सकिएन।");
      setNotice(d.message || "बचत रद्द गरियो।");
      await loadMonthlyContributions();
      if (active === "Overview") {
        const sr = await fetch("/api/bhalai-kosh/dashboard-summary");
        if (sr.ok) setDashboardSummary(await sr.json());
      }
    } catch (e) { setNotice(e.message); }
    finally { setSavingMemberId(null); }
  };
  const postSchoolInvestment = async () => {
    if (!window.confirm("२०८१/०७/०१ मा United English Boarding School बाट भलाई कोषमा आएको रु. १३,९४,००० बैंक लगानीको रूपमा दर्ता गर्ने हो? यसले बैंक मौज्दात र Voucher दुवैमा असर गर्छ।")) return;
    setDashboardLoading(true);
    try {
      const r = await fetch("/api/bhalai-kosh/school-investment", {method:"POST"});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "विद्यालय लगानी दर्ता गर्न सकिएन।");
      setNotice(d.message || "विद्यालय लगानी बैंकमा दर्ता भयो।");
      const sr = await fetch("/api/bhalai-kosh/dashboard-summary");
      if (sr.ok) setDashboardSummary(await sr.json());
    } catch (e) { setNotice(e.message); }
    finally { setDashboardLoading(false); }
  };
  const saveContribution = async (member) => {
    const amount = Number(depositAmounts[member.dbId] ?? 1000);
    if (!member.dbId || !Number.isFinite(amount) || amount <= 0) { setNotice("सही जम्मा रकम राख्नुहोस्।"); return; }
    setSavingMemberId(member.dbId);
    try {
      const r = await fetch("/api/bhalai-kosh/contributions", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memberId:member.dbId,year:Number(depositYear),month:Number(depositMonth),amount,paidOn:depositDates[member.dbId] || null,paymentMethod:depositMethods[member.dbId] || "cash"})});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "जम्मा दर्ता गर्न सकिएन।");
      setNotice("जम्मा सफल भयो। Cash/Bank Voucher नं.: "+d.voucherNo);
      await loadMonthlyContributions();
    } catch (e) { setNotice(e.message); }
    finally { setSavingMemberId(null); }
  };
  const activeMembers = members.filter(m => m.status === "Active" && m.dbId);
  const paidMemberIds = new Set(contributions.map(x => Number(x.member_id)));
  const pendingMembers = activeMembers.filter(m => !paidMemberIds.has(Number(m.dbId)));
  const depositRows = [
    ...activeMembers.map(m => ({ member:m, paid:contributions.find(x => Number(x.member_id)===Number(m.dbId)) })),
    ...contributions.filter(x => !activeMembers.some(m => Number(m.dbId)===Number(x.member_id))).map(x => ({ member:{dbId:Number(x.member_id),id:x.member_code,name:x.full_name},paid:x }))
  ];
  const paidTotal = contributions.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  useEffect(() => { if (!authReady) return; setSavingMembers(true); fetch("/api/bhalai-kosh/members").then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error||"सदस्य विवरण ल्याउन सकिएन।"); setMembers((d.members||[]).map(m=>({...m,dbId:m.id,id:m.member_code,name:m.full_name,phone:m.phone||"",joined:m.joined_on||"",savings:Number(m.ledger_balance||0),loan:0,status:m.status==="active"?"Active":m.status}))); setNotice("सदस्य विवरण Database बाट प्राप्त भयो।"); }).catch(e=>setNotice(e.message)).finally(()=>setSavingMembers(false)); }, [authReady]);
  useEffect(() => {
    if (!authReady || active !== "Overview") return;
    let cancelled = false;
    setDashboardLoading(true);
    fetch("/api/bhalai-kosh/dashboard-summary").then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Dashboard विवरण ल्याउन सकिएन।");
      if (!cancelled) setDashboardSummary(d);
    }).catch(e => { if (!cancelled) setNotice(e.message); })
      .finally(() => { if (!cancelled) setDashboardLoading(false); });
    return () => { cancelled = true; };
  }, [authReady, active]);
  useEffect(() => {
    if (!authReady || active !== "Reports") return;
    let cancelled = false;
    setReportLoading(true); setReportError("");
    try {
      const params = new URLSearchParams();
      const from = bsToAdDate(reportFromBs), to = bsToAdDate(reportToBs);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      fetch("/api/bhalai-kosh/reports?" + params.toString()).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error([d.error || "प्रतिवेदन ल्याउन सकिएन।", d.detail ? "Database विवरण: " + d.detail : "", d.code ? "Code: " + d.code : ""].filter(Boolean).join("\n"));
        if (!cancelled) setReportData(d);
      }).catch(e => { if (!cancelled) setReportError(e.message); })
        .finally(() => { if (!cancelled) setReportLoading(false); });
    } catch (e) { setReportError(e.message); setReportLoading(false); }
    return () => { cancelled = true; };
  }, [authReady, active, reportFromBs, reportToBs]);
  useEffect(() => {
    if (!authReady || active !== "Ledger") return;
    if (!ledgerMemberId) { setLedgerData(null); setLedgerError(""); return; }
    const controller = new AbortController();
    const loadLedger = async () => {
      setLedgerLoading(true);
      setLedgerError("");
      try {
        const params = new URLSearchParams();
        if (ledgerAppliedFromBs.trim()) params.set("fromBs", ledgerAppliedFromBs.trim());
        if (ledgerAppliedToBs.trim()) params.set("toBs", ledgerAppliedToBs.trim());
        const response = await fetch("/api/bhalai-kosh/ledger/" + encodeURIComponent(ledgerMemberId) + "?" + params.toString(), { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "सदस्य Ledger ल्याउन सकिएन।");
        setLedgerData(data);
      } catch (error) {
        if (error.name !== "AbortError") setLedgerError(error.message || "Ledger ल्याउन सकिएन।");
      } finally {
        if (!controller.signal.aborted) setLedgerLoading(false);
      }
    };
    loadLedger();
    return () => controller.abort();
  }, [authReady, active, ledgerMemberId, ledgerAppliedFromBs, ledgerAppliedToBs]);
  const latinDigits=value=>String(value??"").replace(/[०-९]/g,d=>"०१२३४५६७८९".indexOf(d));
  const startLedgerEdit=row=>{
    const type=row.transaction_type;
    setLedgerEditRow(row);
    setLedgerEditForm({
      date:latinDigits(toBsDate(row.transaction_date)),
      amount:String(type==="loan_disbursement"?(row.disbursed_amount||row.debit||0):(row.saving_amount||row.credit||0)),
      principalAmount:String(row.principal_amount||0),interestAmount:String(row.interest_amount||0),feeAmount:String(row.fee_amount||0),
      paymentMethod:row.payment_method||row.saving_method||row.disbursement_method||"cash"
    });
  };
  const saveLedgerEdit=async()=>{
    if(!ledgerEditRow)return;
    setLedgerEditBusy(true);
    try{
      const date=bsToAdDate(ledgerEditForm.date);
      const type=ledgerEditRow.transaction_type;
      const payload={transactionType:type,date,paymentMethod:ledgerEditForm.paymentMethod};
      if(type==="loan_repayment")Object.assign(payload,{principalAmount:Number(ledgerEditForm.principalAmount),interestAmount:Number(ledgerEditForm.interestAmount),feeAmount:Number(ledgerEditForm.feeAmount)});
      else payload.amount=Number(ledgerEditForm.amount);
      const response=await fetch("/api/bhalai-kosh/ledger/"+encodeURIComponent(ledgerMemberId)+"/"+encodeURIComponent(ledgerEditRow.id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Ledger सम्पादन गर्न सकिएन।");
      const params=new URLSearchParams();if(ledgerAppliedFromBs.trim())params.set("fromBs",ledgerAppliedFromBs.trim());if(ledgerAppliedToBs.trim())params.set("toBs",ledgerAppliedToBs.trim());
      const fresh=await fetch("/api/bhalai-kosh/ledger/"+encodeURIComponent(ledgerMemberId)+"?"+params.toString());const freshData=await fresh.json();if(!fresh.ok)throw new Error(freshData.error||"अपडेट गरिएको Ledger ल्याउन सकिएन।");
      setLedgerData(freshData);setLedgerEditRow(null);setNotice(data.message||"Ledger कारोबार अपडेट भयो।");
      if(active==="Overview"){const sr=await fetch("/api/bhalai-kosh/dashboard-summary");if(sr.ok)setDashboardSummary(await sr.json());}
    }catch(e){setLedgerError(e.message);}finally{setLedgerEditBusy(false);}
  };
  const filtered = useMemo(() => members.filter(m => (m.name + m.id + m.phone).toLowerCase().includes(query.toLowerCase())), [members, query]);
  const totalSavings = members.reduce((s, m) => s + m.savings, 0);
  const outstanding = members.reduce((s, m) => s + m.loan, 0);
  const currentReport = reportConfigs[reportType];
  const currentReportRows = reportType==="balanceSheet" ? [
    ...(reportData?.balanceSheet?.assets||[]).map(x=>({...x,section:"सम्पत्ति",balance:x.balance})),
    ...(reportData?.balanceSheet?.liabilities||[]).map(x=>({...x,section:"दायित्व",balance:x.balance})),
    ...(reportData?.balanceSheet?.equity||[]).map(x=>({...x,section:"कोष/पूँजी",balance:x.balance})),
    {account_code:"",account_name:"चालु अवधिको खुद आम्दानी",account_type:"equity",balance:reportData?.balanceSheet?.netIncome||0}
  ] : (reportData?.[reportType] || []);
  const visibleReportRows = reportType === "accountingLedger" && accountingAccountId !== "all"
    ? currentReportRows.filter(row => String(row.account_id) === accountingAccountId)
    : currentReportRows;
  const exportCurrentReport = () => {
    if (!visibleReportRows.length) { setReportError("डाउनलोड गर्न प्रतिवेदन विवरण छैन।"); return; }
    const columns = currentReport.columns;
    const csv = [columns.map(x => x[1]), ...visibleReportRows.map(row => columns.map(([key]) => String(row[key] ?? "").replace(/"/g,'""')))]
      .map(row => row.map(value => '"'+value+'"').join(",")).join("\r\n");
    const blob = new Blob(["\\uFEFF",csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "bhalai-kosh-"+reportType+".csv"; link.click();
    URL.revokeObjectURL(url);
  };
  const importInitialStaff = async () => {
    if(!window.confirm("५२ जना कर्मचारीको नाम/कोड/उपलब्ध बैंक खाता र साउन–कात्तिक २०८३ सम्मको पुरानो बचत (प्रति महिना रु. १,०००) Cash Receipt Voucher सहित Database मा राख्ने हो? पहिले दर्ता भएका सदस्य/महिनाको बचत दोहोरिँदैन।")) return;
    setInitialImportBusy(true);
    try {
      const r=await fetch("/api/bhalai-kosh/initial-import",{method:"POST"});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"प्रारम्भिक विवरण राख्न सकिएन।");
      const mr=await fetch("/api/bhalai-kosh/members"); const md=await mr.json();
      if(mr.ok) setMembers((md.members||[]).map(m=>({...m,dbId:m.id,id:m.member_code,name:m.full_name,phone:m.phone||"",joined:m.joined_on||"",savings:Number(m.ledger_balance||0),loan:0,status:m.status==="active"?"Active":m.status})));
      setNotice("कर्मचारी सूची तयार: "+d.createdMembers+" नयाँ, "+d.matchedMembers+" पहिलेदेखि थिए। पुरानो बचत पोस्ट: "+d.createdSavings+" महिना (रु. "+money(d.totalRecorded)+"), पहिले भएको "+d.skippedSavings+" प्रविष्टि दोहोरिएन।");
    } catch(e){setNotice(e.message);}
    finally{setInitialImportBusy(false);}
  };
  const startEditMember = (m) => {
    setMemberForm({id:m.dbId,memberCode:m.member_code||m.id,fullName:m.full_name||m.name,nepaliName:m.nepali_name||"",gender:m.gender||"",dateOfBirth:m.date_of_birth?String(m.date_of_birth).slice(0,10):"",phone:m.phone||"",email:m.email||"",address:m.address||"",citizenshipNo:m.citizenship_no||"",designation:m.designation||"",department:m.department||"",bankName:m.bank_name||"",bankBranch:m.bank_branch||"",bankAccountName:m.bank_account_name||"",bankAccountNo:m.bank_account_no||"",emergencyContact:m.emergency_contact||"",joinedOn:m.joined_on?String(m.joined_on).slice(0,10):"",status:(m.status||"active").toLowerCase()==="active"?"active":(m.status||"left").toLowerCase(),notes:m.notes||""});
    setEditingMember(m);
  };
  const updateMember = async () => {
    setMemberBusy(true);
    try {
      const r=await fetch("/api/bhalai-kosh/members",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(memberForm)});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"अपडेट गर्न सकिएन।");
      setMembers(prev=>prev.map(m=>m.dbId===Number(memberForm.id)?({...m,...d.member,dbId:d.member.id,id:d.member.member_code,name:d.member.full_name,phone:d.member.phone||"",joined:d.member.joined_on||"",status:d.member.status==="active"?"Active":d.member.status}):m));
      setEditingMember(null);setNotice("कर्मचारी विवरण सफलतापूर्वक अपडेट भयो।");
    } catch(e) { setNotice(e.message); }
    finally { setMemberBusy(false); }
  };
  const deleteMember = async (m) => {
    if(!window.confirm(m.name+" लाई हटाउने हो? कारोबार भएको सदस्यको आर्थिक इतिहास मेटिँदैन; निष्क्रिय बनाइन्छ।")) return;
    try {
      const r=await fetch("/api/bhalai-kosh/members?id="+m.dbId,{method:"DELETE"});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"हटाउन सकिएन।");
      setMembers(prev=>prev.filter(x=>x.dbId!==m.dbId));
      setNotice(d.message||"सदस्य हटाइयो।");
    } catch(e) { setNotice(e.message); }
  };
  const addMember = async () => {
    if (!newName.trim() || !newId.trim()) return;
    try {
      const r=await fetch("/api/bhalai-kosh/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memberCode:newId,fullName:newName,phone:newPhone})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"सदस्य थप्न सकिएन।");
      setMembers(prev=>[...prev,{dbId:d.member.id,id:d.member.member_code,name:d.member.full_name,phone:d.member.phone||"",joined:d.member.joined_on||"",savings:0,loan:0,status:"Active"}]);
      setNewName("");setNewPhone("");setNewId("");setShowAdd(false);setNotice("नयाँ सदस्य Database मा सुरक्षित भयो।");
    } catch(e) { setNotice(e.message); }
  };

  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#f4f6f3] text-sm font-semibold text-slate-500">प्रमाणीकरण जाँच हुँदैछ…</main>;
  return (
    <main className="min-h-screen bg-[#f4f6f3] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNav(!mobileNav)} className="rounded-lg border p-2 lg:hidden" aria-label="Menu">{mobileNav ? <X size={18}/> : <Menu size={18}/>}</button>
            <Link href="/#projects" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Portfolio</Link>
            <span className="hidden h-6 w-px bg-slate-200 sm:block"/>
            <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-white"><Landmark size={19}/></span><div><p className="text-sm font-extrabold leading-tight">United Employee Benefit Fund</p><p className="text-[10px] font-medium tracking-wide text-slate-500">EMPLOYEE BENEFIT FUND MANAGEMENT</p></div></div>
          </div>
          <div className="flex items-center gap-2"><span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">Live Database</span><button className="rounded-xl border border-slate-200 p-2 text-slate-500"><Bell size={17}/></button><div className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">AD</div></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[245px_1fr]">
        <aside className={`${mobileNav ? "block" : "hidden"} border-r border-slate-200 bg-white p-4 lg:block`}>
          <p className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Main menu</p>
          <nav className="space-y-1">{navItems.map(([key, label, Icon]) => <button key={key} onClick={() => {setActive(key);if(key==="Finance")setFinanceTab("journal");setMobileNav(false);}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active === key ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={18}/>{label}{active === key && <ChevronRight className="ml-auto" size={15}/>}</button>)}</nav>
          <div className="mt-10 rounded-2xl bg-[#102d25] p-4 text-white"><p className="text-xs font-bold text-emerald-200">मासिक अनिवार्य बचत</p><p className="mt-2 text-3xl font-black">रु. १,०००</p><p className="mt-2 text-[11px] leading-5 text-white/60">प्रत्येक सक्रिय सदस्यको मासिक योगदान</p></div>
          <button onClick={() => setActive("Settings")} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"><Settings size={18}/> Settings</button>
        </aside>
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Welfare fund / {active}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{navItems.find(n => n[0] === active)?.[1] || "सेटिङ"} </h1><p className="mt-1 text-sm text-slate-500">स्वतन्त्र सदस्य बचत, ऋण तथा किस्ता व्यवस्थापन</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"><Plus size={16}/> सदस्य थप्नुहोस्</button><button onClick={() => setNotice("Report export वास्तविक backend जडान भएपछि उपलब्ध हुनेछ।")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><Download size={16}/> Export</button></div></div>
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">{notice}</div>
          {active === "Overview" && <>
            {!dashboardSummary?.cashBank?.bankLedger?.some(x=>x.reference_no==="BK-RC-20810701-UEBS") && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-bold text-blue-900">विद्यालयको प्रारम्भिक बैंक लगानी</p><p className="mt-1 text-xs text-blue-800">२०८१/०७/०१ — United English Boarding School — रु. १३,९४,०००</p><button disabled={dashboardLoading} onClick={postSchoolInvestment} className="mt-3 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{dashboardLoading?"प्रक्रिया हुँदैछ…":"बैंक Ledger मा लगानी दर्ता गर्नुहोस्"}</button></div>}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[[Landmark,"United English Boarding School लगानी","रु. "+money(dashboardSummary?.schoolInvestment?.amount||0),"२०८१/०७/०१ को बैंक लगानी"],[Wallet,"हाल कायम सदस्य बचत","रु. "+money(dashboardSummary?.savings?.total||0),"फिर्ता भएको रकम घटाएर"],[HandCoins,"कुल ऋण वितरण","रु. "+money(dashboardSummary?.loans?.totalIssued||0),(dashboardSummary?.loans?.issuedCount||0)+" वटा वितरित ऋण"],[TrendingUp,"बाँकी साँवा","रु. "+money(dashboardSummary?.loans?.principalOutstanding||0),"असुल हुन बाँकी मूलधन"],[TrendingUp,"बाँकी ब्याज","रु. "+money(dashboardSummary?.loans?.interestOutstanding||0),"किस्ता तालिकाअनुसार"],[Landmark,"ब्याज आम्दानी","रु. "+money(dashboardSummary?.income?.interest||0),"प्राप्त ब्याज Voucher बाट"],[Wallet,"नगद मौज्दात","रु. "+money(dashboardSummary?.cashBank?.cash||0),"Cash Ledger (खाता 1001)"],[Landmark,"बैंक मौज्दात","रु. "+money(dashboardSummary?.cashBank?.bank||0),"Bank Ledger (खाता 1002)"],[Landmark,"नगद तथा बैंक जम्मा","रु. "+money(dashboardSummary?.cashBank?.total||0),"Cash + Bank Ledger Balance"],[Users,"सक्रिय सदस्य",String(dashboardSummary?.activeMembers??members.length),"Database सदस्य सूची"],[HandCoins,"विचाराधीन ऋण",String(dashboardSummary?.loans?.pendingCount||0),"स्वीकृति पर्खिरहेका"]].map(([Icon,label,value,sub])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19}/></span></div><p className="mt-5 text-2xl font-black tracking-tight">{dashboardLoading?"…":value}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></article>)}
            </div>
            {Number(dashboardSummary?.cashBank?.total||0)<0 && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><b>नगद/बैंक Ledger मौज्दात ऋणात्मक छ।</b> Dashboard ले अब Chart of Accounts का posted Voucher Ledger (1001 Cash र 1002 Bank) कै Balance देखाउँछ। वास्तविक प्रारम्भिक मौज्दात वा कारोबार मिलान आवश्यक भए प्रमाणित Voucher अनुसार छुट्टै सुधार गर्नुपर्छ; पुरानो कारोबार स्वतः परिवर्तन गरिएको छैन।</div>}
            

            <div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>{setFinanceTab("loans");setActive("Finance");}} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">ऋण आवेदन तथा Voucher खोल्नुहोस्</button><button onClick={()=>{setFinanceTab("coa");setActive("Finance");}} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">Chart of Accounts हेर्नुहोस्</button></div><div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">मासिक कोष गतिविधि</h2><p className="mt-1 text-xs text-slate-400">बचत, ऋण वितरण र किस्ता असुली</p></div><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold">२०८३/८४</span></div><div className="mt-8 grid h-48 grid-cols-6 items-end gap-3">{[48,65,54,82,70,92].map((v,i)=><div key={i} className="flex h-full flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center gap-1"><div style={{height:v+"%"}} className="w-3 rounded-t bg-emerald-600"/><div style={{height:(v*.55)+"%"}} className="w-3 rounded-t bg-amber-400"/></div><span className="text-[10px] text-slate-400">{["जेठ","असार","साउन","भदौ","असोज","कात्तिक"][i]}</span></div>)}</div><div className="mt-4 flex gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600"/> बचत</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-amber-400"/> ऋण/किस्ता गतिविधि</span></div></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">कोष सञ्चालन नियम</h2><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b pb-3"><span className="text-slate-500">मासिक बचत</span><b>रु. १,०००</b></div><div className="flex justify-between border-b pb-3"><span className="text-slate-500">ऋण सीमा</span><b>उपलब्ध कोषअनुसार</b></div><div className="flex justify-between border-b pb-3"><span className="text-slate-500">किस्ता</span><b>मूलधन + ब्याज</b></div><div className="flex justify-between"><span className="text-slate-500">अतिरिक्त रकम</span><b>जरिवाना / Extra</b></div></div></article></div>
          </>}
          {active === "Members" && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-extrabold">सदस्य निर्देशिका</h2><p className="mt-1 text-xs text-slate-400">Database मा सुरक्षित सदस्य सूची</p><button disabled={initialImportBusy} onClick={importInitialStaff} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{initialImportBusy?"कर्मचारी तथा पुरानो बचत राखिँदैछ…":"५२ कर्मचारी र पुरानो बचत स्वतः राख्नुहोस्"}</button></div><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="नाम वा Member ID खोज्नुहोस्" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 sm:w-72"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Member ID","सदस्यको नाम","सम्पर्क","सदस्य बनेको","कुल बचत","बाँकी ऋण","स्थिति","कार्य"].map(x=><th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{filtered.map(m=><tr key={m.id} className="border-b border-slate-100"><td className="px-4 py-4 font-bold text-emerald-800">{m.id}</td><td className="px-4 py-4 font-semibold">{m.name}</td><td className="px-4 py-4 text-slate-500">{m.phone}</td><td className="px-4 py-4">{m.joined}</td><td className="px-4 py-4 font-semibold">रु. {money(m.savings)}</td><td className="px-4 py-4">रु. {money(m.loan)}</td><td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{m.status}</span></td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={()=>startEditMember(m)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Edit</button><button onClick={()=>deleteMember(m)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700">Delete</button></div></td></tr>)}</tbody></table></div></article>}
          {active === "Deposits" && <div className="space-y-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div><h2 className="font-extrabold">कर्मचारी मासिक बचत तथा Cash Voucher</h2><p className="mt-1 text-xs text-slate-500">वर्ष परिवर्तन गरेर मासिक बचत अभिलेख हेर्नुहोस्। प्रत्येक जम्मा गर्दा Cash/Bank Receipt Voucher र सदस्य Ledger स्वतः पोस्ट हुन्छ।</p></div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-500">वर्ष (वि.सं.)<select value={depositYear} onChange={e=>setDepositYear(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">{Array.from({length:12},(_,i)=>String(2080+i)).map(y=><option key={y} value={y}>{y}</option>)}</select></label>
                  <label className="text-xs font-semibold text-slate-500">महिना<select value={depositMonth} onChange={e=>setDepositMonth(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">{nepaliMonths.map((m,i)=><option key={m} value={String(i+1)}>{m}</option>)}</select></label>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">प्रति कर्मचारी मासिक</p><b className="mt-1 block text-xl">रु. १,०००</b></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">सक्रिय कर्मचारी</p><b className="mt-1 block text-xl">{activeMembers.length}</b></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">जम्मा गरेका</p><b className="mt-1 block text-xl">{contributions.length}</b></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">यस महिनाको जम्मा</p><b className="mt-1 block text-xl">रु. {money(paidTotal)}</b></div>
              </div>
            </article>
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><h3 className="font-extrabold">वर्ष {depositYear} — {nepaliMonths[Number(depositMonth)-1]} बचत Sheet</h3><p className="mt-1 text-xs text-slate-500">जम्मा नभएको कर्मचारीको रकम भरेर Cash Voucher मार्फत दर्ता गर्नुहोस्।</p></div><button onClick={loadMonthlyContributions} className="rounded-lg border px-3 py-2 text-xs font-bold">Refresh</button></div>
              {depositLoading ? <p className="p-8 text-center text-sm text-slate-500">विवरण लोड हुँदैछ…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["कर्मचारी नं.","कर्मचारीको नाम","जम्मा रकम","जम्मा मिति (AD)","भुक्तानी माध्यम","रसिद / Voucher","स्थिति","कार्य"].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{depositRows.map(({member:m,paid})=>{return <tr key={m.dbId} className="border-t border-slate-100"><td className="px-3 py-3 font-bold text-emerald-800">{m.id}</td><td className="px-3 py-3 font-semibold">{m.name}</td><td className="px-3 py-3">{paid?<b>रु. {money(paid.amount)}</b>:<input type="number" min="1" value={depositAmounts[m.dbId] ?? 1000} onChange={e=>setDepositAmounts(p=>({...p,[m.dbId]:e.target.value}))} className="w-28 rounded-lg border px-2 py-2"/>}</td><td className="px-3 py-3">{paid?String(paid.paid_on||"").slice(0,10):<input type="date" value={depositDates[m.dbId]||""} onChange={e=>setDepositDates(p=>({...p,[m.dbId]:e.target.value}))} className="rounded-lg border px-2 py-2"/>}</td><td className="px-3 py-3">{paid?(paid.payment_method||"cash"):<select value={depositMethods[m.dbId]||"cash"} onChange={e=>setDepositMethods(p=>({...p,[m.dbId]:e.target.value}))} className="rounded-lg border px-2 py-2"><option value="cash">Cash</option><option value="bank">Bank</option><option value="transfer">Transfer</option><option value="cheque">Cheque</option><option value="online">Online</option></select>}</td><td className="px-3 py-3 text-xs">{paid?.receipt_no||"—"}</td><td className="px-3 py-3">{paid?<span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">जम्मा भयो</span>:<span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">बाँकी</span>}</td><td className="px-3 py-3">{paid?<div className="flex items-center gap-2"><span className="text-xs text-slate-400">Posted</span><button disabled={savingMemberId===m.dbId} onClick={()=>deleteContribution(paid)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">{savingMemberId===m.dbId?"हटाउँदैछ…":"हटाउनुहोस्"}</button></div>:<button disabled={savingMemberId===m.dbId} onClick={()=>saveContribution(m)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{savingMemberId===m.dbId?"सेभ हुँदैछ…":"Cash Voucher बनाउनुहोस्"}</button>}</td></tr>})}{!depositRows.length && <tr><td colSpan="8" className="px-4 py-8 text-center text-sm font-semibold text-emerald-700">यस महिनाका सबै सक्रिय सदस्यको बचत दर्ता भइसकेको छ। नयाँ बचत बाँकी छैन।</td></tr>}</tbody></table></div>}
            </article>
            <p className="text-xs leading-5 text-slate-500">नोट: वर्ष र महिना BS अनुसार चयन हुन्छ। मिति प्रविष्टि AD मितिमा हुन्छ। पुरानो वर्षको विवरण हेर्न वर्ष परिवर्तन गर्नुहोस्। एउटै कर्मचारीको एउटै महिनाको दोहोरो जम्मा रोकिएको छ।</p>
          </div>}
          {active === "Finance" && <FinanceWorkspace key={financeTab} initialTab={financeTab} onOpenLedger={(id)=>{setAccountingAccountId(String(id));setReportType("accountingLedger");setActive("Reports");}} />}
          {active === "Loans" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">ऋण आवेदन तथा स्वीकृति</h2><p className="mt-2 text-sm text-slate-500">ऋण उपलब्ध कोषको सीमा भित्र मात्र स्वीकृत गर्ने। ब्याजदर, अवधि र EMI तालिका स्वीकृतिपूर्व देखाउने।</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{["ऋण आवेदन","स्वीकृत ऋण","किस्ता तालिका"].map(x=><div key={x} className="rounded-xl border border-slate-200 p-4"><HandCoins className="text-emerald-700"/><p className="mt-3 font-bold">{x}</p><p className="mt-1 text-xs text-slate-400">Backend जडानपछि सक्रिय हुनेछ</p></div>)}</div></article>}
          {active === "Import" && <article className="rounded-2xl border border-dashed border-emerald-300 bg-white p-8 text-center"><FileSpreadsheet className="mx-auto text-emerald-700" size={34}/><h2 className="mt-4 font-extrabold">मासिक Excel / CSV Import</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Employee ID, Name, Month, Monthly Deposit, EMI Amount र Penalty/Extra भएका फाइल अपलोड गरी Preview र Validation पछि मात्र Import गर्ने सुविधा।</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white"><Upload size={16}/> Excel / CSV छान्नुहोस्<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>setNotice(e.target.files?.[0] ? e.target.files[0].name+" चयन भयो। Import Preview सुविधा backend चरणमा जडान हुनेछ।" : notice)}/></label></article>}
          {active === "Reports" && <div className="space-y-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><h2 className="font-extrabold">वित्तीय तथा ऋण प्रतिवेदन</h2><p className="mt-1 text-xs text-slate-500">Database मा पोस्ट भएका कारोबारबाट प्रत्यक्ष तयार गरिएको प्रतिवेदन। सबै मिति वि.सं. मा फिल्टर हुन्छन्।</p></div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs font-semibold">देखि (वि.सं.)<input value={reportFromBs} onChange={e=>setReportFromBs(e.target.value.replace(/[०-९]/g,d=>"०१२३४५६७८९".indexOf(d)))} placeholder="२०८१-०७-०१" className="mt-1 block w-36 rounded-lg border px-2.5 py-2 text-sm"/></label>
                  <label className="text-xs font-semibold">सम्म (वि.सं.)<input value={reportToBs} onChange={e=>setReportToBs(e.target.value.replace(/[०-९]/g,d=>"०१२३४५६७८९".indexOf(d)))} placeholder="हालसम्म" className="mt-1 block w-36 rounded-lg border px-2.5 py-2 text-sm"/></label>
                  <button onClick={()=>{setReportFromBs("");setReportToBs("");}} className="rounded-lg border px-3 py-2 text-xs font-bold">सबै मिति</button>
                  <button onClick={exportCurrentReport} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Download size={14}/> CSV Export</button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">{Object.entries(reportConfigs).map(([key,value])=><button key={key} onClick={()=>setReportType(key)} className={"rounded-lg px-3 py-2 text-xs font-bold "+(reportType===key?"bg-emerald-700 text-white":"border bg-white text-slate-600")}>{value.label}</button>)}</div>
              {reportType==="accountingLedger"&&<div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><label className="text-xs font-bold text-slate-700">खाता छान्नुहोस्<select value={accountingAccountId} onChange={e=>setAccountingAccountId(e.target.value)} className="mt-1 block min-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">सबै खाताको Ledger</option>{(reportData?.accountList||[]).map(account=><option key={account.id} value={String(account.id)}>{account.account_code} — {account.account_name}</option>)}</select></label><p className="text-xs text-slate-500">प्रत्येक खाताको Debit/Credit र Running Balance सहित पोस्ट भएका Voucher कारोबार।</p></div>}
              {reportType==="trialBalance"&&<div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><b>जम्मा Debit: रु. {money(currentReportRows.reduce((s,x)=>s+Number(x.total_debit||0),0))}</b><span className="ml-5"><b>जम्मा Credit: रु. {money(currentReportRows.reduce((s,x)=>s+Number(x.total_credit||0),0))}</b></span></div>}
              {reportType==="balanceSheet"&&<div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs">कुल सम्पत्ति</p><b className="text-xl">रु. {money(reportData?.balanceSheet?.totalAssets||0)}</b></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs">कुल दायित्व</p><b className="text-xl">रु. {money(reportData?.balanceSheet?.totalLiabilities||0)}</b></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs">दायित्व + कोष + खुद आम्दानी</p><b className="text-xl">रु. {money(reportData?.balanceSheet?.totalLiabilitiesEquity||0)}</b></div></div>}
              {reportType==="memberSavings" && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">जम्मा Current Deposit (हाल कायम बचत)</p><p className="mt-1 text-2xl font-black text-emerald-950">रु. {money((reportData?.memberSavings||[]).reduce((sum,row)=>sum+Number(row.current_deposit||0),0))}</p><p className="mt-1 text-xs text-emerald-800">बचत फिर्ता घटाएर बाँकी रहेको रकम मात्र</p></div>}
              {reportData?.summary && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[[ "कुल साँवा असुली",reportData.summary.principal_collected ],["ब्याज आम्दानी",reportData.summary.interest_income],["शुल्क/जरिवाना",reportData.summary.fee_income],["किस्ता संख्या",reportData.summary.payment_count]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><b className="mt-1 block text-lg">{label==="किस्ता संख्या"?value:"रु. "+money(value)}</b></div>)}
              </div>}
              {reportError&&<p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{reportError}</p>}
              {reportLoading?<p className="p-8 text-center text-sm text-slate-500">प्रतिवेदन तयार हुँदैछ…</p>:<div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{currentReport.columns.map(([key,label])=><th key={key} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{visibleReportRows.map((row,index)=><tr key={row.id||row.receipt_no||row.voucher_no||row.account_id+":"+index} className="border-t border-slate-100">{currentReport.columns.map(([key])=><td key={key} className="px-3 py-3 whitespace-nowrap">{key==="period_month"?nepaliMonths[Number(row[key])-1]:["principal","disbursed_amount","principal_outstanding","interest_outstanding","principal_paid","interest_paid","principal_amount","interest_amount","fee_amount","amount","opening_balance","total_in","total_out","balance","debit","credit","total_debit","total_credit","debit_balance","credit_balance","balance","running_balance","total_savings","current_deposit","net_amount","deposit_count","member_count"].includes(key)?money(row[key]):key.endsWith("_on")||key.endsWith("_date")?toBsDate(row[key]):key==="account_type"?({asset:"सम्पत्ति",liability:"दायित्व",equity:"पूँजी/कोष",income:"आम्दानी",expense:"खर्च"}[row[key]]||row[key]):String(row[key]??"—")}</td>)}</tr>)}{!visibleReportRows.length&&<tr><td colSpan={currentReport.columns.length} className="px-4 py-8 text-center text-slate-400">यस मिति दायरामा विवरण भेटिएन।</td></tr>}</tbody></table></div>}
            </article>
          </div>}
          {active === "Ledger" && <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="font-extrabold">व्यक्तिगत सदस्य Ledger</h2><p className="mt-1 text-sm text-slate-500">बचत जम्मा, ऋण वितरण, किस्ता भुक्तानी र प्रत्येक कारोबारपछिको Ledger विवरण एउटै ठाउँमा।</p></div>
              <label className="w-full text-xs font-semibold text-slate-600 sm:max-w-sm">सदस्य छान्नुहोस्
                <select value={ledgerMemberId} onChange={e=>setLedgerMemberId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                  <option value="">-- सदस्य चयन गर्नुहोस् --</option>
                  {members.filter(m=>m.dbId).map(m=><option key={m.dbId} value={m.dbId}>{m.id} — {m.name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-xs font-bold text-slate-600">देखि मिति (वि.सं.)
                <input type="text" inputMode="numeric" value={ledgerFromBs} onChange={e=>setLedgerFromBs(e.target.value)} placeholder="२०८१-०७-०१" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600"/>
              </label>
              <label className="text-xs font-bold text-slate-600">सम्म मिति (वि.सं.)
                <input type="text" inputMode="numeric" value={ledgerToBs} onChange={e=>setLedgerToBs(e.target.value)} placeholder="खाली राखेमा हालसम्म" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600"/>
              </label>
              <div className="flex gap-2"><button onClick={()=>{setLedgerFromBs("2081-07-01");setLedgerToBs("");setLedgerAppliedFromBs("2081-07-01");setLedgerAppliedToBs("");}} className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50">२०८१ कात्तिकदेखि</button><button onClick={()=>{setLedgerAppliedFromBs(ledgerFromBs);setLedgerAppliedToBs(ledgerToBs);}} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800">Filter लागू गर्नुहोस्</button></div>
              <p className="text-[11px] leading-5 text-slate-500 sm:col-span-3">मिति YYYY-MM-DD (वि.सं.) मा राख्नुहोस्। पूर्वनिर्धारित सुरु मिति २०८१-०७-०१ (कात्तिक १) हो।</p>
            </div>
            {ledgerLoading && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ledger Database बाट लोड हुँदैछ…</p>}
            {ledgerError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ledgerError}</p>}
            {ledgerData && <><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">सदस्य</p><p className="mt-1 font-extrabold text-emerald-950">{ledgerData.member.full_name}</p><p className="text-xs text-emerald-800">{ledgerData.member.member_code}</p></div>
              <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">कुल बचत जम्मा</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.totalSavings||0)}</p><p className="text-xs text-emerald-700">{ledgerData.summary?.savingCount||0} पटक बचत</p><p className="text-xs text-rose-600">फिर्ता: रु. {money(ledgerData.summary?.totalRefunded||0)} ({ledgerData.summary?.refundCount||0} पटक)</p></div>
              <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800">कुल ऋण वितरण</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.totalDisbursed||0)}</p><p className="text-xs text-amber-700">{ledgerData.summary?.loanCount||0} वटा ऋण</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">तिरेको ऋणको मूलधन</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.principalPaid||0)}</p><p className="text-xs text-slate-500">ब्याज/जरिवाना: रु. {money(ledgerData.summary?.interestPaid||0)}</p></div>
              <div className="rounded-xl bg-rose-50 p-4"><p className="text-xs font-semibold text-rose-800">बाँकी ऋण मूलधन</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.principalOutstanding||0)}</p><p className="text-xs text-rose-700">Ledger balance: रु. {money(ledgerData.summary?.ledgerBalance||0)}</p></div>
              <div className="rounded-xl bg-orange-50 p-4"><p className="text-xs font-semibold text-orange-800">बाँकी ब्याज</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.interestOutstanding||0)}</p><p className="text-xs text-orange-700">बाँकी साँवा भन्दा छुट्टै</p></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600"><span>अघिल्लो बाँकी (Opening Balance): <b className="text-slate-900">रु. {money(ledgerData.openingBalance||0)}</b></span><span>फिल्टरपछि अन्तिम Balance: <b className="text-emerald-800">रु. {money(ledgerData.closingBalance||0)}</b></span></div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">मिति (ई.सं.)</th><th className="px-4 py-3">नेपाली मिति (वि.सं.)</th><th className="px-4 py-3">कारोबार</th><th className="px-4 py-3">विवरण</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-center">कार्य</th></tr></thead>
              <tbody>{(ledgerData.transactions||[]).map((row,index)=><tr key={row.id||index} className="border-t border-slate-100"><td className="px-4 py-3 whitespace-nowrap">{row.transaction_date ? String(row.transaction_date).slice(0,10) : "—"}</td><td className="px-4 py-3 whitespace-nowrap">{toBsDate(row.transaction_date)}</td><td className="px-4 py-3">{({contribution:"मासिक बचत",saving:"मासिक बचत",refund:"बचत फिर्ता",loan_disbursement:"ऋण वितरण",loan_repayment:"ऋण किस्ता"})[row.transaction_type]||row.transaction_type}</td><td className="px-4 py-3">{row.narration||"—"}</td><td className="px-4 py-3 text-right">{money(row.debit)}</td><td className="px-4 py-3 text-right">{money(row.credit)}</td><td className="px-4 py-3 text-right font-bold">{money(row.running_balance)}</td><td className="px-4 py-3 text-center">{["contribution","saving","loan_disbursement","loan_repayment"].includes(row.transaction_type)&&<button onClick={()=>startLedgerEdit(row)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Edit</button>}</td></tr>)}
                {!ledgerData.transactions?.length && <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400">यस सदस्यको Ledger मा कारोबार भेटिएन। पहिले Opening Balance वा बचत कारोबार दर्ता गर्नुहोस्।</td></tr>}
              </tbody></table></div></>}
            {!ledgerMemberId && !ledgerLoading && <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Ledger हेर्न माथिबाट सदस्य चयन गर्नुहोस्।</div>}
          </article>}
          {active === "Settings" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">कोष सेटिङ</h2><p className="mt-2 text-sm text-slate-500">मासिक बचत रकम, ब्याज गणना विधि, ऋण अवधि, जरिवाना नियम र वित्तीय वर्ष सेट गर्ने सुविधा।</p></article>}
        </section>
      </div>
      {ledgerEditRow&&<div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Ledger कारोबार सम्पादन</h2><p className="text-xs text-slate-500">{({contribution:"मासिक बचत",saving:"मासिक बचत",loan_disbursement:"ऋण वितरण",loan_repayment:"EMI किस्ता"})[ledgerEditRow.transaction_type]}</p></div><button onClick={()=>setLedgerEditRow(null)} className="rounded-lg border px-3 py-1.5 text-sm">बन्द</button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">मिति (वि.सं. YYYY-MM-DD)<input value={ledgerEditForm.date||""} onChange={e=>setLedgerEditForm(v=>({...v,date:latinDigits(e.target.value)}))} placeholder="२०८३-०७-२०" className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label>
          {ledgerEditRow.transaction_type!=="loan_repayment"&&<label className="text-xs font-semibold text-slate-600">रकम (रु.)<input type="number" min="0.01" step="0.01" value={ledgerEditForm.amount||""} onChange={e=>setLedgerEditForm(v=>({...v,amount:e.target.value}))} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label>}
          {ledgerEditRow.transaction_type==="loan_repayment"&&<>{[["principalAmount","साँवा"],["interestAmount","ब्याज"],["feeAmount","जरिवाना/शुल्क"]].map(([key,label])=><label key={key} className="text-xs font-semibold text-slate-600">{label}<input type="number" min="0" step="0.01" value={ledgerEditForm[key]||""} onChange={e=>setLedgerEditForm(v=>({...v,[key]:e.target.value}))} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/></label>)}</>}
          <label className="text-xs font-semibold text-slate-600">कारोबार माध्यम<select value={ledgerEditForm.paymentMethod||"cash"} onChange={e=>setLedgerEditForm(v=>({...v,paymentMethod:e.target.value}))} className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="cash">नगद (Cash)</option><option value="bank">बैंक (Bank)</option></select></label>
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">सुरक्षित गरेपछि सम्बन्धित Voucher, सदस्य Ledger, Cash/Bank कारोबार र EMI किस्ता तालिका पनि मिलाइनेछ।</p>
        <div className="mt-5 flex justify-end gap-2"><button onClick={()=>setLedgerEditRow(null)} className="rounded-lg border px-4 py-2 text-sm">रद्द</button><button disabled={ledgerEditBusy} onClick={saveLedgerEdit} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{ledgerEditBusy?"अपडेट हुँदैछ…":"परिवर्तन सुरक्षित गर्नुहोस्"}</button></div>
      </div></div>}
      {editingMember && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">कर्मचारी विवरण सम्पादन</h2><p className="text-xs text-slate-500">आवश्यक विवरण परिवर्तन गरी Update गर्नुहोस्।</p></div><button onClick={()=>setEditingMember(null)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[
["memberCode","कर्मचारी कोड *"],["fullName","पूरा नाम *"],["nepaliName","नेपाली नाम"],["phone","फोन नम्बर"],["email","इमेल"],["gender","लिङ्ग"],["dateOfBirth","जन्ममिति"],["joinedOn","नियुक्ति/सदस्य मिति"],["designation","पद"],["department","विभाग"],["citizenshipNo","नागरिकता नं."],["address","ठेगाना"],["bankName","बैंकको नाम"],["bankBranch","बैंक शाखा"],["bankAccountName","खातावालाको नाम"],["bankAccountNo","बैंक खाता नं."],["emergencyContact","आपत्कालीन सम्पर्क"],["notes","कैफियत"]
].map(([key,label])=><label key={key} className="text-xs font-semibold text-slate-600">{label}<input type={["dateOfBirth","joinedOn"].includes(key)?"date":"text"} value={memberForm[key]||""} onChange={e=>setMemberForm(v=>({...v,[key]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>)}<label className="text-xs font-semibold text-slate-600">स्थिति<select value={memberForm.status||"active"} onChange={e=>setMemberForm(v=>({...v,status:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="left">Left</option></select></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setEditingMember(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">रद्द</button><button disabled={memberBusy} onClick={updateMember} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{memberBusy?"सेभ हुँदैछ…":"परिवर्तन सुरक्षित गर्नुहोस्"}</button></div></div></div>}
      {showAdd && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">नयाँ सदस्य दर्ता</h2><button onClick={()=>setShowAdd(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-3"><input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="Member ID *" className="w-full rounded-xl border p-3 text-sm"/><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="पूरा नाम *" className="w-full rounded-xl border p-3 text-sm"/><input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="सम्पर्क नम्बर" className="w-full rounded-xl border p-3 text-sm"/></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setShowAdd(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">रद्द</button><button onClick={addMember} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">थप्नुहोस्</button></div></div></div>}
    </main>
  );
}
