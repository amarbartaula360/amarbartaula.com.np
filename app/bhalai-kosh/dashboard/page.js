"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Users, Landmark, TrendingUp, Search, Plus, FileSpreadsheet, LayoutDashboard, HandCoins, BookOpen, BarChart3, Bell, Settings, Download, Upload, ChevronRight, Menu, X } from "lucide-react";
import FinanceWorkspace from "../components/FinanceWorkspace";

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
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const nepaliMonths = ["साउन","भदौ","असोज","कात्तिक","मंसिर","पुस","माघ","फागुन","चैत","बैशाख","जेठ","असार"];
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
  const paidMemberIds = new Set(contributions.map(x => Number(x.member_id)));
  const paidTotal = contributions.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const activeMembers = members.filter(m => m.status === "Active" && m.dbId);

  useEffect(() => { if (!authReady) return; setSavingMembers(true); fetch("/api/bhalai-kosh/members").then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error||"सदस्य विवरण ल्याउन सकिएन।"); setMembers((d.members||[]).map(m=>({...m,dbId:m.id,id:m.member_code,name:m.full_name,phone:m.phone||"",joined:m.joined_on||"",savings:Number(m.ledger_balance||0),loan:0,status:m.status==="active"?"Active":m.status}))); setNotice("सदस्य विवरण Database बाट प्राप्त भयो।"); }).catch(e=>setNotice(e.message)).finally(()=>setSavingMembers(false)); }, [authReady]);
  useEffect(() => {
    if (!authReady || active !== "Ledger") return;
    if (!ledgerMemberId) { setLedgerData(null); setLedgerError(""); return; }
    const controller = new AbortController();
    const loadLedger = async () => {
      setLedgerLoading(true);
      setLedgerError("");
      try {
        const params = new URLSearchParams();
        if (ledgerFromBs.trim()) params.set("fromBs", ledgerFromBs.trim());
        if (ledgerToBs.trim()) params.set("toBs", ledgerToBs.trim());
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
  }, [authReady, active, ledgerMemberId, ledgerFromBs, ledgerToBs]);
  const filtered = useMemo(() => members.filter(m => (m.name + m.id + m.phone).toLowerCase().includes(query.toLowerCase())), [members, query]);
  const totalSavings = members.reduce((s, m) => s + m.savings, 0);
  const outstanding = members.reduce((s, m) => s + m.loan, 0);
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[[Wallet,"सदस्य Ledger Balance", "रु. "+money(totalSavings), "Ledger मा रेकर्ड भएको जम्मा"],[HandCoins,"कुल ऋण वितरण","—","ऋण API अर्को चरणमा"],[TrendingUp,"बाँकी ऋण","—","ऋण API अर्को चरणमा"],[Users,"कुल सक्रिय सदस्य",String(members.length),"Database सदस्य सूची"]].map(([Icon,label,value,sub])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19}/></span></div><p className="mt-5 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></article>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>{setFinanceTab("loans");setActive("Finance");}} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">ऋण आवेदन तथा Voucher खोल्नुहोस्</button><button onClick={()=>{setFinanceTab("coa");setActive("Finance");}} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">Chart of Accounts हेर्नुहोस्</button></div><div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">मासिक कोष गतिविधि</h2><p className="mt-1 text-xs text-slate-400">बचत, ऋण वितरण र किस्ता असुली</p></div><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold">२०८३/८४</span></div><div className="mt-8 grid h-48 grid-cols-6 items-end gap-3">{[48,65,54,82,70,92].map((v,i)=><div key={i} className="flex h-full flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center gap-1"><div style={{height:v+"%"}} className="w-3 rounded-t bg-emerald-600"/><div style={{height:(v*.55)+"%"}} className="w-3 rounded-t bg-amber-400"/></div><span className="text-[10px] text-slate-400">{["जेठ","असार","साउन","भदौ","असोज","कात्तिक"][i]}</span></div>)}</div><div className="mt-4 flex gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600"/> बचत</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-amber-400"/> ऋण/किस्ता गतिविधि</span></div></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">कोष सञ्चालन नियम</h2><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b pb-3"><span className="text-slate-500">मासिक बचत</span><b>रु. १,०००</b></div><div className="flex justify-between border-b pb-3"><span className="text-slate-500">ऋण सीमा</span><b>उपलब्ध कोषअनुसार</b></div><div className="flex justify-between border-b pb-3"><span className="text-slate-500">किस्ता</span><b>मूलधन + ब्याज</b></div><div className="flex justify-between"><span className="text-slate-500">अतिरिक्त रकम</span><b>जरिवाना / Extra</b></div></div></article></div>
          </>}
          {active === "Members" && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-extrabold">सदस्य निर्देशिका</h2><p className="mt-1 text-xs text-slate-400">Database मा सुरक्षित सदस्य सूची</p><button disabled={initialImportBusy} onClick={importInitialStaff} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{initialImportBusy?"कर्मचारी तथा पुरानो बचत राखिँदैछ…":"५२ कर्मचारी र पुरानो बचत स्वतः राख्नुहोस्"}</button></div><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="नाम वा Member ID खोज्नुहोस्" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 sm:w-72"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Member ID","सदस्यको नाम","सम्पर्क","सदस्य बनेको","कुल बचत","बाँकी ऋण","स्थिति","कार्य"].map(x=><th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{filtered.map(m=><tr key={m.id} className="border-b border-slate-100"><td className="px-4 py-4 font-bold text-emerald-800">{m.id}</td><td className="px-4 py-4 font-semibold">{m.name}</td><td className="px-4 py-4 text-slate-500">{m.phone}</td><td className="px-4 py-4">{m.joined}</td><td className="px-4 py-4 font-semibold">रु. {money(m.savings)}</td><td className="px-4 py-4">रु. {money(m.loan)}</td><td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{m.status}</span></td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={()=>startEditMember(m)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Edit</button><button onClick={()=>deleteMember(m)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700">Delete</button></div></td></tr>)}</tbody></table></div></article>}
          {active === "Deposits" && <div className="space-y-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div><h2 className="font-extrabold">कर्मचारी मासिक बचत तथा Cash Voucher</h2><p className="mt-1 text-xs text-slate-500">वर्ष परिवर्तन गरेर नयाँ आर्थिक वर्षको मासिक अभिलेख अद्यावधिक गर्नुहोस्। प्रत्येक जम्मा गर्दा Cash/Bank Receipt Voucher र सदस्य Ledger स्वतः पोस्ट हुन्छ।</p></div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-500">आर्थिक वर्ष (BS)<select value={depositYear} onChange={e=>setDepositYear(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">{Array.from({length:12},(_,i)=>String(2080+i)).map(y=><option key={y} value={y}>{y}/{String(Number(y)+1).slice(-2)}</option>)}</select></label>
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
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><h3 className="font-extrabold">{depositYear}/{String(Number(depositYear)+1).slice(-2)} — {nepaliMonths[Number(depositMonth)-1]} बचत Sheet</h3><p className="mt-1 text-xs text-slate-500">जम्मा नभएको कर्मचारीको रकम भरेर Cash Voucher मार्फत दर्ता गर्नुहोस्।</p></div><button onClick={loadMonthlyContributions} className="rounded-lg border px-3 py-2 text-xs font-bold">Refresh</button></div>
              {depositLoading ? <p className="p-8 text-center text-sm text-slate-500">विवरण लोड हुँदैछ…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["कर्मचारी नं.","कर्मचारीको नाम","जम्मा रकम","जम्मा मिति (AD)","भुक्तानी माध्यम","रसिद / Voucher","स्थिति","कार्य"].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{activeMembers.map(m=>{const paid=contributions.find(c=>Number(c.member_id)===Number(m.dbId));return <tr key={m.dbId} className="border-t border-slate-100"><td className="px-3 py-3 font-bold text-emerald-800">{m.id}</td><td className="px-3 py-3 font-semibold">{m.name}</td><td className="px-3 py-3">{paid?<b>रु. {money(paid.amount)}</b>:<input type="number" min="1" value={depositAmounts[m.dbId] ?? 1000} onChange={e=>setDepositAmounts(p=>({...p,[m.dbId]:e.target.value}))} className="w-28 rounded-lg border px-2 py-2"/>}</td><td className="px-3 py-3">{paid?String(paid.paid_on||"").slice(0,10):<input type="date" value={depositDates[m.dbId]||""} onChange={e=>setDepositDates(p=>({...p,[m.dbId]:e.target.value}))} className="rounded-lg border px-2 py-2"/>}</td><td className="px-3 py-3">{paid?(paid.payment_method||"cash"):<select value={depositMethods[m.dbId]||"cash"} onChange={e=>setDepositMethods(p=>({...p,[m.dbId]:e.target.value}))} className="rounded-lg border px-2 py-2"><option value="cash">Cash</option><option value="bank">Bank</option><option value="transfer">Transfer</option><option value="cheque">Cheque</option><option value="online">Online</option></select>}</td><td className="px-3 py-3 text-xs">{paid?.receipt_no||"—"}</td><td className="px-3 py-3">{paid?<span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">जम्मा भयो</span>:<span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">बाँकी</span>}</td><td className="px-3 py-3">{paid?<span className="text-xs text-slate-400">Posted</span>:<button disabled={savingMemberId===m.dbId} onClick={()=>saveContribution(m)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{savingMemberId===m.dbId?"सेभ हुँदैछ…":"Cash Voucher बनाउनुहोस्"}</button>}</td></tr>})}</tbody></table></div>}
            </article>
            <p className="text-xs leading-5 text-slate-500">नोट: वर्ष र महिना BS अनुसार चयन हुन्छ। मिति प्रविष्टि AD मितिमा हुन्छ। पुरानो वर्षको विवरण हेर्न वर्ष परिवर्तन गर्नुहोस्। एउटै कर्मचारीको एउटै महिनाको दोहोरो जम्मा रोकिएको छ।</p>
          </div>}
          {active === "Finance" && <FinanceWorkspace key={financeTab} initialTab={financeTab} />}
          {active === "Loans" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">ऋण आवेदन तथा स्वीकृति</h2><p className="mt-2 text-sm text-slate-500">ऋण उपलब्ध कोषको सीमा भित्र मात्र स्वीकृत गर्ने। ब्याजदर, अवधि र EMI तालिका स्वीकृतिपूर्व देखाउने।</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{["ऋण आवेदन","स्वीकृत ऋण","किस्ता तालिका"].map(x=><div key={x} className="rounded-xl border border-slate-200 p-4"><HandCoins className="text-emerald-700"/><p className="mt-3 font-bold">{x}</p><p className="mt-1 text-xs text-slate-400">Backend जडानपछि सक्रिय हुनेछ</p></div>)}</div></article>}
          {active === "Import" && <article className="rounded-2xl border border-dashed border-emerald-300 bg-white p-8 text-center"><FileSpreadsheet className="mx-auto text-emerald-700" size={34}/><h2 className="mt-4 font-extrabold">मासिक Excel / CSV Import</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Employee ID, Name, Month, Monthly Deposit, EMI Amount र Penalty/Extra भएका फाइल अपलोड गरी Preview र Validation पछि मात्र Import गर्ने सुविधा।</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white"><Upload size={16}/> Excel / CSV छान्नुहोस्<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>setNotice(e.target.files?.[0] ? e.target.files[0].name+" चयन भयो। Import Preview सुविधा backend चरणमा जडान हुनेछ।" : notice)}/></label></article>}
          {active === "Reports" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">वित्तीय प्रतिवेदन</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{["मासिक बचत प्रतिवेदन","वार्षिक कोष विवरण","सदस्यगत बचत विवरण","ऋण तथा बाँकी किस्ता","बैंक/नगद मिलान","जरिवाना तथा अतिरिक्त रकम"].map(x=><div key={x} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold">{x}<Download size={16} className="text-slate-400"/></div>)}</div></article>}
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
              <button onClick={()=>{setLedgerFromBs("2081-07-01");setLedgerToBs("");}} className="rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50">२०८१ कात्तिकदेखि</button>
              <p className="text-[11px] leading-5 text-slate-500 sm:col-span-3">मिति YYYY-MM-DD (वि.सं.) मा राख्नुहोस्। पूर्वनिर्धारित सुरु मिति २०८१-०७-०१ (कात्तिक १) हो।</p>
            </div>
            {ledgerLoading && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ledger Database बाट लोड हुँदैछ…</p>}
            {ledgerError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ledgerError}</p>}
            {ledgerData && <><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">सदस्य</p><p className="mt-1 font-extrabold text-emerald-950">{ledgerData.member.full_name}</p><p className="text-xs text-emerald-800">{ledgerData.member.member_code}</p></div>
              <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">कुल बचत जम्मा</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.totalSavings||0)}</p><p className="text-xs text-emerald-700">{ledgerData.summary?.savingCount||0} पटक</p></div>
              <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800">कुल ऋण वितरण</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.totalDisbursed||0)}</p><p className="text-xs text-amber-700">{ledgerData.summary?.loanCount||0} वटा ऋण</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">तिरेको ऋणको मूलधन</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.principalPaid||0)}</p><p className="text-xs text-slate-500">ब्याज/जरिवाना: रु. {money(ledgerData.summary?.interestPaid||0)}</p></div>
              <div className="rounded-xl bg-rose-50 p-4"><p className="text-xs font-semibold text-rose-800">बाँकी ऋण मूलधन</p><p className="mt-1 text-xl font-black">रु. {money(ledgerData.summary?.principalOutstanding||0)}</p><p className="text-xs text-rose-700">Ledger balance: रु. {money(ledgerData.summary?.ledgerBalance||0)}</p></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600"><span>अघिल्लो बाँकी (Opening Balance): <b className="text-slate-900">रु. {money(ledgerData.openingBalance||0)}</b></span><span>फिल्टरपछि अन्तिम Balance: <b className="text-emerald-800">रु. {money(ledgerData.closingBalance||0)}</b></span></div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">मिति</th><th className="px-4 py-3">कारोबार</th><th className="px-4 py-3">विवरण</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
              <tbody>{(ledgerData.transactions||[]).map((row,index)=><tr key={row.id||index} className="border-t border-slate-100"><td className="px-4 py-3 whitespace-nowrap">{row.transaction_date ? new Date(String(row.transaction_date).slice(0,10)+"T12:00:00").toLocaleDateString("ne-NP-u-ca-bikram") : "—"}</td><td className="px-4 py-3">{row.transaction_type}</td><td className="px-4 py-3">{row.narration||"—"}</td><td className="px-4 py-3 text-right">{money(row.debit)}</td><td className="px-4 py-3 text-right">{money(row.credit)}</td><td className="px-4 py-3 text-right font-bold">{money(row.running_balance)}</td></tr>)}
                {!ledgerData.transactions?.length && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">यस सदस्यको Ledger मा कारोबार भेटिएन। पहिले Opening Balance वा बचत कारोबार दर्ता गर्नुहोस्।</td></tr>}
              </tbody></table></div></>}
            {!ledgerMemberId && !ledgerLoading && <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Ledger हेर्न माथिबाट सदस्य चयन गर्नुहोस्।</div>}
          </article>}
          {active === "Settings" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">कोष सेटिङ</h2><p className="mt-2 text-sm text-slate-500">मासिक बचत रकम, ब्याज गणना विधि, ऋण अवधि, जरिवाना नियम र वित्तीय वर्ष सेट गर्ने सुविधा।</p></article>}
        </section>
      </div>
      {editingMember && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">कर्मचारी विवरण सम्पादन</h2><p className="text-xs text-slate-500">आवश्यक विवरण परिवर्तन गरी Update गर्नुहोस्।</p></div><button onClick={()=>setEditingMember(null)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[
["memberCode","कर्मचारी कोड *"],["fullName","पूरा नाम *"],["nepaliName","नेपाली नाम"],["phone","फोन नम्बर"],["email","इमेल"],["gender","लिङ्ग"],["dateOfBirth","जन्ममिति"],["joinedOn","नियुक्ति/सदस्य मिति"],["designation","पद"],["department","विभाग"],["citizenshipNo","नागरिकता नं."],["address","ठेगाना"],["bankName","बैंकको नाम"],["bankBranch","बैंक शाखा"],["bankAccountName","खातावालाको नाम"],["bankAccountNo","बैंक खाता नं."],["emergencyContact","आपत्कालीन सम्पर्क"],["notes","कैफियत"]
].map(([key,label])=><label key={key} className="text-xs font-semibold text-slate-600">{label}<input type={["dateOfBirth","joinedOn"].includes(key)?"date":"text"} value={memberForm[key]||""} onChange={e=>setMemberForm(v=>({...v,[key]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>)}<label className="text-xs font-semibold text-slate-600">स्थिति<select value={memberForm.status||"active"} onChange={e=>setMemberForm(v=>({...v,status:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="left">Left</option></select></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setEditingMember(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">रद्द</button><button disabled={memberBusy} onClick={updateMember} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{memberBusy?"सेभ हुँदैछ…":"परिवर्तन सुरक्षित गर्नुहोस्"}</button></div></div></div>}
      {showAdd && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">नयाँ सदस्य दर्ता</h2><button onClick={()=>setShowAdd(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-3"><input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="Member ID *" className="w-full rounded-xl border p-3 text-sm"/><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="पूरा नाम *" className="w-full rounded-xl border p-3 text-sm"/><input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="सम्पर्क नम्बर" className="w-full rounded-xl border p-3 text-sm"/></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setShowAdd(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">रद्द</button><button onClick={addMember} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">थप्नुहोस्</button></div></div></div>}
    </main>
  );
}
