import Link from "next/link";
import { Building2, Users, RefreshCw, FileCheck2, CreditCard, MapPinned, Search, Bell, ShieldCheck, ArrowUpRight, BriefcaseBusiness, ClipboardList } from "lucide-react";

const modules = [
  { icon: Building2, title: "व्यवसाय दर्ता", en: "Business Registration", detail: "नयाँ व्यवसाय दर्ता तथा विवरण व्यवस्थापन", state: "Setup pending" },
  { icon: RefreshCw, title: "नवीकरण", en: "Renewals", detail: "नवीकरण मिति, शुल्क तथा म्याद सकिएका व्यवसाय", state: "Setup pending" },
  { icon: FileCheck2, title: "कर चुक्ता", en: "Tax Clearance", detail: "आर्थिक वर्षअनुसार कर चुक्ता प्रमाणपत्र", state: "Setup pending" },
  { icon: Users, title: "सदस्यता", en: "Membership", detail: "संघका सदस्य तथा सदस्यता अभिलेख", state: "Setup pending" },
  { icon: ClipboardList, title: "प्रतिवेदन", en: "Reports", detail: "वडा, व्यवसायको प्रकार र अवस्थाअनुसार रिपोर्ट", state: "Setup pending" },
  { icon: ShieldCheck, title: "प्रयोगकर्ता", en: "User Management", detail: "Admin, Staff तथा Read-only पहुँच", state: "Setup pending" },
];

const stats = [
  { label: "कुल व्यवसाय", en: "Total Businesses", value: "—", icon: Building2 },
  { label: "नवीकरण गर्नुपर्ने", en: "Renewals Due", value: "—", icon: RefreshCw },
  { label: "सदस्य व्यवसाय", en: "Member Businesses", value: "—", icon: Users },
  { label: "कर चुक्ता बाँकी", en: "Tax Clearance Pending", value: "—", icon: FileCheck2 },
];

export const metadata = {
  title: "व्यवसाय व्यवस्थापन प्रणाली | मकवानपुर उद्योग वाणिज्य संघ",
  description: "मकवानपुर उद्योग वाणिज्य संघ, पश्चिम क्षेत्र समिति — व्यवसाय दर्ता, नवीकरण, कर चुक्ता तथा सदस्यता व्यवस्थापन प्रणाली।",
};

export default function MauhbaPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 px-5 py-7 text-white lg:flex">
          <div className="flex items-center gap-3 border-b border-white/10 pb-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"><Building2 size={24}/></div>
            <div><p className="text-sm font-bold">पश्चिम क्षेत्र समिति</p><p className="text-xs text-slate-400">Business Registry</p></div>
          </div>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">मुख्य मेनु / Main menu</p>
          <nav className="mt-3 space-y-1">
            <a href="#overview" className="flex items-center gap-3 rounded-xl bg-emerald-500/15 px-3 py-3 text-sm font-semibold text-emerald-300"><BriefcaseBusiness size={18}/> ड्यासबोर्ड</a>
            <a href="#modules" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"><Building2 size={18}/> व्यवसाय व्यवस्थापन</a>
            <a href="#modules" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"><RefreshCw size={18}/> नवीकरण तथा कर चुक्ता</a>
            <a href="#modules" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"><Users size={18}/> सदस्यता</a>
            <a href="#modules" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5"><ClipboardList size={18}/> प्रतिवेदन</a>
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-300"><ShieldCheck size={17}/><span className="text-xs font-semibold">सुरक्षित प्रणाली</span></div>
            <p className="text-xs leading-5 text-slate-400">अधिकृत प्रयोगकर्ताका लागि भूमिका-आधारित पहुँच उपलब्ध गराइनेछ।</p>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <div><p className="text-xs font-medium text-slate-500">मकवानपुर उद्योग वाणिज्य संघ · पश्चिम क्षेत्र समिति</p><h1 className="mt-1 text-lg font-bold sm:text-xl">व्यवसाय व्यवस्थापन प्रणाली</h1></div>
            <div className="flex items-center gap-3"><span className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex">प्रारम्भिक सेटअप</span><button aria-label="Notifications" className="rounded-xl border border-slate-200 p-2.5 text-slate-500"><Bell size={18}/></button><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">AD</div></div>
          </header>
          <div id="overview" className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div><p className="text-sm font-semibold text-emerald-700">स्वागत छ</p><h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">व्यवसाय अभिलेख ड्यासबोर्ड</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">मनहरी गाउँपालिका, मकवानपुरका व्यवसायहरूको दर्ता, नवीकरण, कर चुक्ता र सदस्यता अभिलेख एकै ठाउँमा व्यवस्थापन गर्ने प्रणाली।</p></div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"><MapPinned size={16}/> मनहरी गाउँपालिका, मकवानपुर</div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{item.label}</span><span className="rounded-xl bg-slate-100 p-2.5 text-slate-600"><Icon size={19}/></span></div><p className="mt-4 text-3xl font-bold text-slate-900">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.en} · डाटाबेस जडान भएपछि देखिनेछ</p></div>})}
            </div>
            <div className="mt-9 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">प्रणालीका मोड्युलहरू</h3><p className="mt-1 text-sm text-slate-500">System modules</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"><Search size={16}/> व्यवसाय खोजी (सेटअप बाँकी)</div></div>
            <div id="modules" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((item) => { const Icon = item.icon; return <article key={item.en} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Icon size={22}/></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{item.state}</span></div><h4 className="mt-4 font-bold">{item.title}</h4><p className="mt-0.5 text-xs font-medium text-slate-400">{item.en}</p><p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">{item.detail}</p><div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-400">विकास प्रक्रियामा <ArrowUpRight size={14}/></div></article>})}
            </div>
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-2 text-amber-700"><CreditCard size={20}/></div><div><h3 className="font-bold text-amber-950">प्रणाली प्रारम्भिक सेटअपमा छ</h3><p className="mt-1 text-sm leading-6 text-amber-900/80">यो ड्यासबोर्डको प्रारम्भिक संस्करण हो। वास्तविक व्यवसाय विवरण, लगइन/प्रयोगकर्ता प्रमाणीकरण, नवीकरण तथा प्रतिवेदन सुविधा प्रयोगमा ल्याउन Neon डेटाबेस र होस्टिङ वातावरणको सुरक्षित कन्फिगरेसन पूरा गर्न बाँकी छ। हाल कुनै व्यवसायको तथ्याङ्क प्रविष्ट गरिएको छैन।</p></div></div></div>
            <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} मकवानपुर उद्योग वाणिज्य संघ, पश्चिम क्षेत्र समिति · Business Management System</footer>
          </div>
        </section>
      </div>
    </main>
  );
}
