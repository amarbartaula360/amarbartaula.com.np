"use client";
import { useState } from "react";
import {
  ArrowUpRight, Github, Mail, Menu, X, Code2, GraduationCap,
  Database, Globe2, Layers3, Sparkles, MapPin, Phone, ExternalLink
} from "lucide-react";

const projects = [
  { name: "UEBS Fee Reminder System", number: "01", category: "EDUCATION TECHNOLOGY", desc: "A school-focused platform for student fee tracking and communication workflows.", tags: ["Next.js", "Prisma", "PostgreSQL"], href: "https://fee.amarbarta.com.np", source: "https://github.com/amarbartaula360/uebs-calling-system", icon: GraduationCap },
  { name: "Ledger Pro", number: "02", category: "ACCOUNTING SOFTWARE", desc: "A school accounting dashboard for student records, transactions, invoices and reports.", tags: ["Next.js", "React", "Lucide"], href: "/ledger-pro", source: "https://github.com/amarbartaula360/amarbartaula.com.np", icon: Database },
  { name: "School Accounting Software", number: "03", category: "WEB APPLICATION", desc: "A web-based accounting interface designed around clear financial workflows.", tags: ["React", "JavaScript", "Dashboard UI"], href: "https://github.com/amarbartaula360/school-accounting-software", source: "https://github.com/amarbartaula360/school-accounting-software", icon: Layers3 },
  { name: "भलाई कोष", number: "04", category: "WELFARE FUND MANAGEMENT", desc: "A standalone staff welfare fund platform for member savings, loans, monthly repayments and financial reports.", tags: ["Next.js", "PostgreSQL", "Excel Import"], href: "/bhalai-kosh", source: "https://github.com/amarbartaula360/amarbartaula.com.np", icon: Layers3 }
];
const skills = ["Next.js", "React", "JavaScript", "Tailwind CSS", "Node.js", "PostgreSQL", "Prisma", "REST APIs", "Git & GitHub", "Cloudflare", "Render", "Figma"];
const nav = [["About", "#about"], ["Work", "#projects"], ["Skills", "#skills"], ["Contact", "#contact"]];

export default function Home() {
  const [menu, setMenu] = useState(false);
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f3ef] text-[#17221f] selection:bg-[#c4f06b] selection:text-[#17221f]">
      <header className="sticky top-0 z-50 border-b border-[#17221f]/10 bg-[#f4f3ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#home" className="group flex items-center gap-3" aria-label="Amar Bartaula home">
            <span className="grid size-10 place-items-center rounded-full bg-[#17221f] text-sm font-black tracking-tight text-[#c4f06b]">AB.</span>
            <span className="text-sm font-bold tracking-tight">AMAR BARTAULA<span className="ml-1 text-[#84918b]">/ PORTFOLIO</span></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#53605a] md:flex">
            {nav.map(([label, href]) => <a key={label} href={href} className="transition hover:text-[#17221f]">{label}</a>)}
          </nav>
          <a href="#contact" className="hidden items-center gap-2 rounded-full bg-[#c4f06b] px-5 py-3 text-sm font-bold transition hover:bg-[#b4e45a] md:inline-flex">Let’s talk <ArrowUpRight size={16}/></a>
          <button onClick={() => setMenu(!menu)} className="rounded-full border border-[#17221f]/15 p-2 md:hidden" aria-label="Toggle menu">{menu ? <X size={20}/> : <Menu size={20}/>}</button>
        </div>
        {menu && <nav className="grid gap-1 border-t border-[#17221f]/10 bg-[#f4f3ef] p-4 md:hidden">{nav.map(([label, href]) => <a key={label} onClick={() => setMenu(false)} href={href} className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-white">{label}</a>)}</nav>}
      </header>

      <section id="home" className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 md:grid-cols-[1.15fr_.85fr] md:pb-32 md:pt-28">
        <div className="absolute -left-40 top-20 size-80 rounded-full bg-[#c4f06b]/20 blur-3xl"/>
        <div className="relative">
          <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#17221f]/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#53605a]"><span className="size-2 rounded-full bg-[#7ebc37]"/> Building useful digital products</p>
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#77827c]">Hello, I’m</p>
          <h1 className="mt-5 max-w-3xl text-[clamp(3.6rem,8vw,7.4rem)] font-black leading-[.91] tracking-[-.075em]">Amar<br/><span className="text-[#7c9f43]">Bartaula.</span></h1>
          <h2 className="mt-8 text-xl font-semibold tracking-tight sm:text-2xl">Full-stack Web Developer</h2>
          <p className="mt-2 text-sm text-[#6b7770]">Educational Administrator <span className="px-1 text-[#a5afa9]">·</span> Technology Integrator</p>
          <p className="mt-7 max-w-xl text-base leading-8 text-[#53605a]">I design and build practical digital products that make everyday work simpler — from modern web experiences to education-focused management systems.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#projects" className="inline-flex items-center gap-3 rounded-full bg-[#17221f] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#30443b]">Explore my work <ArrowUpRight size={17}/></a>
            <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-[#17221f]/20 px-6 py-4 text-sm font-bold transition hover:bg-white">Get in touch</a>
          </div>
          <p className="mt-10 flex items-center gap-2 text-xs font-medium text-[#77827c]"><MapPin size={14}/> Based in Nepal · Building for the web</p>
        </div>
        <div className="relative mx-auto w-full max-w-[470px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#17221f] p-7 text-white shadow-2xl shadow-[#17221f]/15 sm:p-10">
            <div className="absolute -right-20 -top-20 size-72 rounded-full border border-[#c4f06b]/25"/>
            <div className="absolute -right-8 -top-8 size-48 rounded-full border border-[#c4f06b]/25"/>
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.22em] text-[#c4f06b]"><span>Developer / Creator</span><Sparkles size={17}/></div>
              <div>
                <div className="mb-8 grid size-24 place-items-center rounded-[1.7rem] border border-white/15 bg-white/5 text-4xl font-black tracking-[-.08em] text-[#c4f06b]">AB.</div>
                <p className="max-w-xs text-4xl font-black leading-[1.05] tracking-[-.05em] sm:text-5xl">Ideas into<br/><span className="text-[#c4f06b]">systems.</span></p>
                <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">Thoughtful design. Useful technology. Real-world impact.</p>
              </div>
              <div className="flex items-end justify-between border-t border-white/15 pt-5"><span className="text-[10px] uppercase tracking-[.2em] text-white/45">Portfolio · 2026</span><Code2 className="text-[#c4f06b]" size={25}/></div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-[#17221f]/10 bg-white px-5 py-4 shadow-xl"><Code2 size={18} className="text-[#789b3e]"/><p className="mt-2 text-sm font-bold">Full-stack</p><p className="text-xs text-[#7b867f]">Web development</p></div>
          <div className="absolute -right-4 top-12 rounded-2xl bg-[#c4f06b] px-5 py-4 shadow-xl"><Globe2 size={18}/><p className="mt-2 text-sm font-bold">Digital systems</p><p className="text-xs text-[#45533b]">Education-focused</p></div>
        </div>
      </section>

      <section id="about" className="border-y border-[#17221f]/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:py-24">
          <div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#789b3e]">01 / About</p><h2 className="mt-5 max-w-sm text-4xl font-black leading-[1.05] tracking-[-.05em] sm:text-5xl">Technology with a human purpose.</h2></div>
          <div className="flex flex-col justify-end"><p className="max-w-2xl text-lg leading-9 text-[#53605a]">I’m interested in connecting people, processes and technology through clear interfaces and structured information. My work focuses on practical web applications, education technology and continuous improvement.</p><div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#17221f]/10 pt-6 sm:grid-cols-3"><div><p className="text-2xl font-black">Web</p><p className="mt-1 text-xs text-[#7b867f]">Application development</p></div><div><p className="text-2xl font-black">EdTech</p><p className="mt-1 text-xs text-[#7b867f]">Education workflows</p></div><div className="col-span-2 sm:col-span-1"><p className="text-2xl font-black">UI/UX</p><p className="mt-1 text-xs text-[#7b867f]">Simple user experiences</p></div></div></div>
        </div>
      </section>

      <section id="projects" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#789b3e]">02 / Selected work</p><h2 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-5xl">Built around<br/>real needs.</h2></div><p className="max-w-sm text-sm leading-7 text-[#66736c]">A selection of platforms focused on practical workflows and useful user experiences.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">{projects.map(p => { const Icon = p.icon; return <article key={p.name} className="group flex min-h-[390px] flex-col rounded-[1.7rem] border border-[#17221f]/10 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#9cba6b] hover:shadow-xl hover:shadow-[#17221f]/5 sm:p-7"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[.2em] text-[#9aa49e]">{p.number}</span><span className="grid size-12 place-items-center rounded-2xl bg-[#edf3e4] text-[#617f32]"><Icon size={22}/></span></div><p className="mt-9 text-[10px] font-bold tracking-[.2em] text-[#819b55]">{p.category}</p><h3 className="mt-3 text-2xl font-black tracking-[-.04em]">{p.name}</h3><p className="mt-3 flex-1 text-sm leading-7 text-[#68756e]">{p.desc}</p><div className="mt-6 flex flex-wrap gap-2">{p.tags.map(t => <span key={t} className="rounded-full bg-[#f1f2ee] px-3 py-1.5 text-[10px] font-semibold text-[#5e6a63]">{t}</span>)}</div><div className="mt-7 flex items-center justify-between border-t border-[#17221f]/10 pt-5 text-xs font-bold"><a href={p.href} target={p.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex items-center gap-2 text-[#536f2d]">View project <ArrowUpRight size={15}/></a><a href={p.source} target="_blank" rel="noreferrer" aria-label={"Source code for " + p.name} className="inline-flex items-center gap-2 text-[#7b867f] transition hover:text-[#17221f]">Source <Github size={15}/></a></div></article>; })}</div>
      </section>

      <section id="skills" className="border-y border-[#17221f]/10 bg-[#e9ece5]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-24"><p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#789b3e]">03 / Toolkit</p><div className="mt-5 grid gap-8 md:grid-cols-[.8fr_1.2fr]"><h2 className="max-w-sm text-4xl font-black leading-[1.05] tracking-[-.05em] sm:text-5xl">Tools for turning ideas into products.</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{skills.map((s, i) => <div key={s} className="flex items-center gap-3 rounded-xl border border-[#17221f]/10 bg-white/70 p-4 text-sm font-semibold"><span className="text-[10px] text-[#9aaa8c]">0{i + 1}</span>{s}</div>)}</div></div></div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#17221f] p-8 text-white sm:p-12 md:p-16"><div className="absolute -right-24 -top-28 size-96 rounded-full border border-[#c4f06b]/20"/><div className="absolute -right-8 -top-12 size-64 rounded-full border border-[#c4f06b]/20"/>
          <div className="relative"><p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#c4f06b]">04 / Get in touch</p><h2 className="mt-6 max-w-2xl text-4xl font-black leading-[1.02] tracking-[-.05em] sm:text-6xl">Have a project<br/>in mind<span className="text-[#c4f06b]">?</span></h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/60">Have an idea, collaboration or question? Get in touch and let’s explore what we can build together.</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="tel:+9779845433722" className="inline-flex items-center gap-2 rounded-full bg-[#c4f06b] px-5 py-3.5 text-sm font-bold text-[#17221f] transition hover:bg-[#b4e45a]"><Phone size={16}/> +977 9845433722</a><a href="mailto:amarbartaula360@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3.5 text-sm font-semibold transition hover:bg-white/10"><Mail size={16}/> Email me</a><a href="https://www.facebook.com/lbartaula" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3.5 text-sm font-semibold transition hover:bg-white/10"><Globe2 size={16}/> Facebook</a><a href="https://github.com/amarbartaula360" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3.5 text-sm font-semibold transition hover:bg-white/10"><Github size={16}/> GitHub</a></div>
            <p className="mt-6 text-xs text-white/40">Available for project discussions and collaboration.</p>
          </div>
        </div>
      </section>
      <footer className="border-t border-[#17221f]/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-[#78847d] sm:flex-row"><span>© {new Date().getFullYear()} Amar Bartaula. Built with purpose.</span><a href="#home" className="inline-flex items-center gap-1 font-semibold transition hover:text-[#17221f]">Back to top <ArrowUpRight size={13}/></a></div></footer>
    </main>
  );
}
