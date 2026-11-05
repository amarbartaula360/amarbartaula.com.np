"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Users, Landmark, TrendingUp, Search, Plus, FileSpreadsheet, LayoutDashboard, HandCoins, BookOpen, BarChart3, Bell, Settings, Download, Upload, ChevronRight, Menu, X } from "lucide-react";

const initialMembers = [
  { id: "BK-0001", name: "Sample Member One", role: "सदस्य", phone: "98XXXXXXXX", joined: "२०८३ वैशाख", savings: 12000, loan: 0, status: "Active" },
  { id: "BK-0002", name: "Sample Member Two", role: "सदस्य", phone: "98XXXXXXXX", joined: "२०८३ जेठ", savings: 11000, loan: 25000, status: "Active" },
  { id: "BK-0003", name: "Sample Member Three", role: "सदस्य", phone: "98XXXXXXXX", joined: "२०८३ असार", savings: 10000, loan: 15000, status: "Active" },
];

const navItems = [
  ["Overview", "ड्यासबोर्ड", LayoutDashboard],
  ["Members", "सदस्यहरू", Users],
  ["Deposits", "मासिक बचत", Wallet],
  ["Loans", "ऋण व्यवस्थापन", HandCoins],
  ["Import", "Excel Import", FileSpreadsheet],
  ["Reports", "प्रतिवेदन", BarChart3],
  ["Ledger", "सदस्य Ledger", BookOpen],
];

const money = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

export default function BhalaiKoshPage() {
  const [active, setActive] = useState("Overview");
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newId, setNewId] = useState("");
  const [notice, setNotice] = useState("यो प्रारम्भिक नमुना हो। Demo विवरणहरू वास्तविक आर्थिक अभिलेख होइनन्।");
  const filtered = useMemo(() => members.filter(m => (m.name + m.id + m.phone).toLowerCase().includes(query.toLowerCase())), [members, query]);
  const totalSavings = members.reduce((s, m) => s + m.savings, 0);
  const outstanding = members.reduce((s, m) => s + m.loan, 0);
  const addMember = () => {
    if (!newName.trim() || !newId.trim()) return;
    setMembers(prev => [...prev, { id: newId.trim(), name: newName.trim(), role: "सदस्य", phone: newPhone.trim(), joined: "२०८३ कात्तिक", savings: 0, loan: 0, status: "Active" }]);
    setNewName(""); setNewPhone(""); setNewId(""); setShowAdd(false);
    setNotice("सदस्य demo सूचीमा थपियो। वास्तविक database मा सुरक्षित गरिएको छैन।");
  };

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
          <div className="flex items-center gap-2"><span className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex">Demo Preview</span><button className="rounded-xl border border-slate-200 p-2 text-slate-500"><Bell size={17}/></button><div className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">AD</div></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[245px_1fr]">
        <aside className={`${mobileNav ? "block" : "hidden"} border-r border-slate-200 bg-white p-4 lg:block`}>
          <p className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Main menu</p>
          <nav className="space-y-1">{navItems.map(([key, label, Icon]) => <button key={key} onClick={() => {setActive(key);setMobileNav(false);}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active === key ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={18}/>{label}{active === key && <ChevronRight className="ml-auto" size={15}/>}</button>)}</nav>
          <div className="mt-10 rounded-2xl bg-[#102d25] p-4 text-white"><p className="text-xs font-bold text-emerald-200">मासिक अनिवार्य बचत</p><p className="mt-2 text-3xl font-black">रु. १,०००</p><p className="mt-2 text-[11px] leading-5 text-white/60">प्रत्येक सक्रिय सदस्यको मासिक योगदान</p></div>
          <button onClick={() => setActive("Settings")} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"><Settings size={18}/> Settings</button>
        </aside>
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Welfare fund / {active}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{navItems.find(n => n[0] === active)?.[1] || "सेटिङ"} </h1><p className="mt-1 text-sm text-slate-500">स्वतन्त्र सदस्य बचत, ऋण तथा किस्ता व्यवस्थापन</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"><Plus size={16}/> सदस्य थप्नुहोस्</button><button onClick={() => setNotice("Report export वास्तविक backend जडान भएपछि उपलब्ध हुनेछ।")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><Download size={16}/> Export</button></div></div>
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">{notice}</div>
          {active === "Overview" && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[[Wallet,"कुल सदस्य बचत", "रु. "+money(totalSavings), "+ मासिक योगदान"],[HandCoins,"कुल ऋण वितरण","रु. ४०,०००","नमुना रकम"],[TrendingUp,"बाँकी ऋण","रु. "+money(outstanding),"सदस्यगत बाँकी"],[Users,"कुल सक्रिय सदस्य",String(members.length),"सदस्य सूची"]].map(([Icon,label,value,sub])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19}/></span></div><p className="mt-5 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></article>)}
            </div>
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">मासिक कोष गतिविधि</h2><p className="mt-1 text-xs text-slate-400">बचत, ऋण वितरण र किस्ता असुली</p></div><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold">२०८३/८४</span></div><div className="mt-8 grid h-48 grid-cols-6 items-end gap-3">{[48,65,54,82,70,92].map((v,i)=><div key={i} className="flex h-full flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center gap-1"><div style={{height:v+"%"}} className="w-3 rounded-t bg-emerald-600"/><div style={{height:(v*.55)+"%"}} className="w-3 rounded-t bg-amber-400"/></div><span className="text-[10px] text-slate-400">{["जेठ","असार","साउन","भदौ","असोज","कात्तिक"][i]}</span></div>)}</div><div className="mt-4 flex gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600"/> बचत</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-amber-400"/> ऋण/किस्ता गतिविधि</span></div></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">कोष सञ्चालन नियम</h2><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b pb-3"><span className="text-slate-500">मासिक बचत</span><b>रु. १,०००</b></div><div className="flex justify-between border-b pb-3"><span className="text-slate-500">ऋण सीमा</span><b>उपलब्ध कोषअनुसार</b></div><div className="flex justify-between border-b pb-3"><span className="text-slate-500">किस्ता</span><b>मूलधन + ब्याज</b></div><div className="flex justify-between"><span className="text-slate-500">अतिरिक्त रकम</span><b>जरिवाना / Extra</b></div></div></article></div>
          </>}
          {active === "Members" && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-extrabold">सदस्य निर्देशिका</h2><p className="mt-1 text-xs text-slate-400">स्वतन्त्र सदस्य ID सहितको सूची</p></div><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="नाम वा Member ID खोज्नुहोस्" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 sm:w-72"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Member ID","सदस्यको नाम","सम्पर्क","सदस्य बनेको","कुल बचत","बाँकी ऋण","स्थिति"].map(x=><th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{filtered.map(m=><tr key={m.id} className="border-b border-slate-100"><td className="px-4 py-4 font-bold text-emerald-800">{m.id}</td><td className="px-4 py-4 font-semibold">{m.name}</td><td className="px-4 py-4 text-slate-500">{m.phone}</td><td className="px-4 py-4">{m.joined}</td><td className="px-4 py-4 font-semibold">रु. {money(m.savings)}</td><td className="px-4 py-4">रु. {money(m.loan)}</td><td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{m.status}</span></td></tr>)}</tbody></table></div></article>}
          {active === "Deposits" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">मासिक बचत संकलन</h2><p className="mt-2 text-sm text-slate-500">प्रत्येक सदस्यको अनिवार्य मासिक योगदान रु. १,०००। नेपाली आर्थिक वर्ष र महिनाअनुसार अभिलेख राख्ने।</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">प्रति सदस्य</p><b className="mt-1 block text-2xl">रु. १,०००</b></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">सदस्य संख्या</p><b className="mt-1 block text-2xl">{members.length}</b></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">यो महिनाको अपेक्षित बचत</p><b className="mt-1 block text-2xl">रु. {money(members.length*1000)}</b></div></div></article>}
          {active === "Loans" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">ऋण आवेदन तथा स्वीकृति</h2><p className="mt-2 text-sm text-slate-500">ऋण उपलब्ध कोषको सीमा भित्र मात्र स्वीकृत गर्ने। ब्याजदर, अवधि र EMI तालिका स्वीकृतिपूर्व देखाउने।</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{["ऋण आवेदन","स्वीकृत ऋण","किस्ता तालिका"].map(x=><div key={x} className="rounded-xl border border-slate-200 p-4"><HandCoins className="text-emerald-700"/><p className="mt-3 font-bold">{x}</p><p className="mt-1 text-xs text-slate-400">Backend जडानपछि सक्रिय हुनेछ</p></div>)}</div></article>}
          {active === "Import" && <article className="rounded-2xl border border-dashed border-emerald-300 bg-white p-8 text-center"><FileSpreadsheet className="mx-auto text-emerald-700" size={34}/><h2 className="mt-4 font-extrabold">मासिक Excel / CSV Import</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Employee ID, Name, Month, Monthly Deposit, EMI Amount र Penalty/Extra भएका फाइल अपलोड गरी Preview र Validation पछि मात्र Import गर्ने सुविधा।</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white"><Upload size={16}/> Excel / CSV छान्नुहोस्<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>setNotice(e.target.files?.[0] ? e.target.files[0].name+" चयन भयो। Import Preview सुविधा backend चरणमा जडान हुनेछ।" : notice)}/></label></article>}
          {active === "Reports" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">वित्तीय प्रतिवेदन</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{["मासिक बचत प्रतिवेदन","वार्षिक कोष विवरण","सदस्यगत बचत विवरण","ऋण तथा बाँकी किस्ता","बैंक/नगद मिलान","जरिवाना तथा अतिरिक्त रकम"].map(x=><div key={x} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold">{x}<Download size={16} className="text-slate-400"/></div>)}</div></article>}
          {active === "Ledger" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">व्यक्तिगत सदस्य Ledger</h2><p className="mt-2 text-sm text-slate-500">प्रत्येक सदस्यको बचत जम्मा, ऋण वितरण, मूलधन असुली, ब्याज र जरिवाना छुट्टाछुट्टै देखिने running balance सहितको विवरण।</p><div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">सदस्य चयन र कारोबार विवरण database/API जडानपछि उपलब्ध हुनेछ।</div></article>}
          {active === "Settings" && <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">कोष सेटिङ</h2><p className="mt-2 text-sm text-slate-500">मासिक बचत रकम, ब्याज गणना विधि, ऋण अवधि, जरिवाना नियम र वित्तीय वर्ष सेट गर्ने सुविधा।</p></article>}
        </section>
      </div>
      {showAdd && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">नयाँ सदस्य (Demo)</h2><button onClick={()=>setShowAdd(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-3"><input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="Member ID *" className="w-full rounded-xl border p-3 text-sm"/><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="पूरा नाम *" className="w-full rounded-xl border p-3 text-sm"/><input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="सम्पर्क नम्बर" className="w-full rounded-xl border p-3 text-sm"/></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setShowAdd(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">रद्द</button><button onClick={addMember} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">थप्नुहोस्</button></div></div></div>}
    </main>
  );
}
