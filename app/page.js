"use client";
import { useEffect, useState } from "react";
const profilePhoto = "https://raw.githubusercontent.com/amarbartaula360/school-accounting-software/main/client/assets/profile.jpg";
import {
  ArrowUpRight, Code2, Database, GraduationCap, Mail, Menu, Monitor,
  PhoneCall, Sparkles, X, Globe2
} from 'lucide-react';

const projects = [
  {
    title: 'Bhalai Kosh',
    category: 'Bhalai Kosh',
    description: 'Employee benefit fund management for member savings, deposits, loans, monthly repayments and financial reports.',
    status: 'Open software',
    icon: Database,
    href: '/bhalaikosh'
  },
  {
    title: 'LedgerPro',
    category: 'Accounting',
    description: 'School and business accounting platform for transactions, payroll, attendance, invoices and financial reports.',
    status: 'Open software',
    icon: Code2,
    href: '/leadgerpro'
  },
  {
    title: 'Exam & Marksheet System',
    category: 'School Systems',
    description: 'A Nepali and English school examination system for exam setup, marks entry, grading, GPA calculation, and printable student marksheets.',
    status: 'In development',
    icon: GraduationCap,
    href: ''
  },
  {
    title: 'School Fee Reminder',
    category: 'School Systems',
    description: 'A school-focused platform for student fee tracking and parent communication workflows.',
    status: 'Open software',
    icon: PhoneCall,
    href: 'https://fee.amarbartaula.com.np/'
  }
];

const filters = ['All', 'Bhalai Kosh', 'Accounting', 'School Systems'];
const skills = ['React', 'JavaScript', 'Vite', 'Node.js', 'REST APIs', 'PostgreSQL', 'Git & GitHub', 'School Information Systems'];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [nepalNow, setNepalNow] = useState(() => new Date());
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const timer = setInterval(() => setNepalNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    window._mypatroDateFormat = 2;
    window._mypatroResponseType = 'html';
    const script = document.createElement('script');
    script.src = 'https://mypatro.com/resources/nepali_date/nepali_date.js';
    script.async = true;
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  const nepalDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).format(nepalNow);
  const nepalTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }).format(nepalNow);
  const visibleProjects = projects.filter(project => activeFilter === 'All' || project.category === activeFilter);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="amar-portfolio">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap');
        .amar-portfolio{--ink:#17231e;--muted:#68766e;--lime:#c6ed79;--paper:#f4f4ef;min-height:100vh;background:var(--paper);color:var(--ink);font-family:'DM Sans','Noto Sans Devanagari',sans-serif;overflow:hidden}
        .amar-portfolio *{box-sizing:border-box}.amar-wrap{width:min(1180px,calc(100% - 44px));margin:auto}
        .amar-nav{min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #17231e18}
        .amar-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);font:800 14px Manrope,sans-serif;letter-spacing:.04em}
        .amar-brand-mark{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--ink);color:var(--lime);font-size:14px;letter-spacing:-1px}
        .amar-brand small{display:block;color:#849087;font:600 9px 'DM Sans',sans-serif;letter-spacing:.16em;margin-top:3px}
        .amar-links{display:flex;gap:29px;align-items:center}.amar-links a{color:#58665e;text-decoration:none;font-size:13px;font-weight:600}.amar-links a:hover{color:var(--ink)}
        .amar-nav-right{display:flex;align-items:center;gap:12px}.amar-nav-clock{display:flex;align-items:center;gap:9px;padding:7px 11px;border:1px solid #17231e20;border-radius:13px;background:#fff9}
        .amar-nav-flag{width:25px;height:36px;display:block;filter:drop-shadow(0 2px 3px #0002)}
        .amar-nav-date{display:flex;flex-direction:column;gap:2px;white-space:nowrap}.amar-nav-time{font:700 11px Manrope,monospace;color:var(--ink);font-variant-numeric:tabular-nums}
        .amar-nav-bs{font:600 10px 'Noto Sans Devanagari',sans-serif;color:#64813d}.amar-nav-ad{font-size:9px;color:#879188}
        .amar-btn{border:1px solid #17231e25;border-radius:999px;padding:12px 17px;background:#fff;color:var(--ink);font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;gap:8px;align-items:center;text-decoration:none;transition:transform .2s,background .2s}
        .amar-btn:hover{transform:translateY(-2px);background:#f8faef}.amar-btn.primary{background:var(--ink);border-color:var(--ink);color:white}.amar-btn.primary:hover{background:#30453a}
        .amar-menu-button{display:none;border:1px solid #17231e25;border-radius:50%;width:42px;height:42px;background:white;color:var(--ink);align-items:center;justify-content:center}
        .amar-hero{position:relative;display:grid;grid-template-columns:1.15fr .85fr;gap:52px;align-items:center;padding:92px 0 100px;min-height:590px}
        .amar-hero:before{content:'';position:absolute;width:420px;height:420px;border-radius:50%;background:#c6ed7933;filter:blur(75px);left:-240px;top:20px;pointer-events:none}
        .amar-hero-copy{position:relative}.amar-kicker{display:inline-flex;gap:8px;align-items:center;color:#536b34;background:#e8f1d9;border:1px solid #d5e5b8;border-radius:30px;padding:9px 14px;font-size:10px;font-weight:800;letter-spacing:.14em}
        .amar-hero h1{font:800 clamp(48px,7vw,88px)/.98 Manrope,sans-serif;letter-spacing:-.075em;margin:25px 0 10px;color:var(--ink)}
        .amar-hero h1 span{color:#7e9e46}.amar-nepali{font-size:20px;color:#7b897f;font-weight:700;margin:0 0 22px}
        .amar-role{font-size:16px;font-weight:800;color:var(--ink);margin:0 0 12px}
        .amar-lead{max-width:610px;color:#627067;font-size:15px;line-height:1.95;margin:0 0 29px}
        .amar-actions{display:flex;gap:10px;flex-wrap:wrap}.amar-location{margin-top:28px;color:#829087;font-size:11px;display:flex;align-items:center;gap:8px}
        .amar-visual{position:relative;min-height:410px;display:grid;place-items:center}
        .amar-photo-card{position:relative;width:min(100%,370px);aspect-ratio:4/4.7;border-radius:32px;background:var(--ink);padding:18px;box-shadow:0 28px 65px #17231e24;overflow:hidden}
        .amar-photo-card:before,.amar-photo-card:after{content:'';position:absolute;border:1px solid #c6ed7940;border-radius:50%;width:310px;height:310px;right:-150px;top:-135px}
        .amar-photo-card:after{width:220px;height:220px;right:-95px;top:-85px}
        .amar-photo-inner{position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between;z-index:1}
        .amar-photo-top{display:flex;justify-content:space-between;color:var(--lime);font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
        .amar-profile-photo{width:190px;height:190px;border-radius:50%;object-fit:cover;display:block;margin:16px auto 18px;border:5px solid #ffffff20;box-shadow:0 15px 40px #0005}
        .amar-photo-title{font:800 clamp(30px,4vw,43px)/1.03 Manrope,sans-serif;letter-spacing:-.06em;color:white;text-align:center}
        .amar-photo-title span{color:var(--lime)}.amar-photo-caption{font-size:12px;line-height:1.7;color:#ffffff91;text-align:center;margin-top:10px}
        .amar-photo-bottom{display:flex;justify-content:space-between;border-top:1px solid #ffffff24;padding-top:14px;color:#ffffff70;font-size:9px;letter-spacing:.16em;text-transform:uppercase}
        .amar-float{position:absolute;z-index:2;padding:11px 14px;border-radius:13px;background:white;border:1px solid #17231e12;color:var(--ink);font-size:11px;font-weight:800;box-shadow:0 12px 30px #17231e16}
        .amar-float.one{top:55px;right:-12px}.amar-float.two{bottom:50px;left:-22px}
        .amar-section{padding:76px 0;border-top:1px solid #17231e18}.amar-section-head{margin-bottom:30px}
        .amar-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:#7e9e46;font-weight:900}
        .amar-section h2{font:800 clamp(30px,4vw,46px)/1.08 Manrope,sans-serif;letter-spacing:-.055em;margin:12px 0;color:var(--ink)}
        .amar-section-head p{color:#718077;line-height:1.85;margin:0;max-width:690px;font-size:14px}
        .amar-about-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
        .amar-info-card,.amar-project{background:white;border:1px solid #17231e12;border-radius:20px;padding:24px;box-shadow:0 5px 20px #17231e05}
        .amar-info-card{transition:transform .2s,box-shadow .2s}.amar-info-card:hover{transform:translateY(-4px);box-shadow:0 16px 35px #17231e0d}
        .amar-info-card svg{color:#7e9e46}.amar-info-card h3{font-size:16px;color:var(--ink);margin:16px 0 8px}.amar-info-card p{font-size:13px;line-height:1.85;color:#718077;margin:0}
        .amar-skill-list{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}.amar-skill{padding:9px 13px;background:#e9eee3;border:1px solid #dce4d3;border-radius:30px;color:#53634b;font-size:11px;font-weight:700}
        .amar-filter{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}.amar-filter button{border:1px solid #17231e20;border-radius:30px;background:white;color:#66736a;padding:9px 14px;font-size:11px;font-weight:700;cursor:pointer}
        .amar-filter button.active{background:var(--ink);color:white;border-color:var(--ink)}
        .amar-project-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}
        .amar-project{display:flex;flex-direction:column;min-height:285px;transition:transform .2s,border-color .2s,box-shadow .2s}
        .amar-project:hover{transform:translateY(-4px);border-color:#a8c27b;box-shadow:0 18px 35px #17231e0d}
        .amar-project.featured{background:#17231e;color:white;border-color:#17231e}.amar-project.featured h3{color:white}.amar-project.featured p{color:#c0cbc2}
        .amar-project-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .amar-project-icon{width:44px;height:44px;display:grid;place-items:center;background:#edf2e6;border-radius:14px;color:#6f8c3d}
        .amar-project.featured .amar-project-icon{background:#ffffff14;color:var(--lime)}
        .amar-status{font-size:10px;color:#5e7938;background:#edf4e2;padding:7px 10px;border-radius:20px;font-weight:800}
        .amar-project.featured .amar-status{color:var(--lime);background:#ffffff14}
        .amar-project h3{font:800 20px Manrope,sans-serif;letter-spacing:-.04em;margin:22px 0 8px;color:var(--ink)}
        .amar-project p{font-size:13px;line-height:1.85;color:#718077;margin:0 0 20px}
        .amar-project .amar-btn{margin-top:auto;align-self:flex-start}.amar-note{color:#8b968e;font-size:11px;margin-top:auto}
        .amar-contact{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:38px;border-radius:26px;background:var(--ink);color:white;position:relative;overflow:hidden}
        .amar-contact:after{content:'';position:absolute;width:300px;height:300px;border:1px solid #c6ed7933;border-radius:50%;right:-110px;top:-150px;box-shadow:0 0 0 45px #c6ed7908,0 0 0 90px #c6ed7905}
        .amar-contact-content{position:relative;z-index:1}.amar-contact h2{margin:0 0 9px;font:800 32px Manrope,sans-serif;letter-spacing:-.05em;color:white}
        .amar-contact p{margin:0;color:#c0cbc2;font-size:13px;line-height:1.8}
        .amar-contact-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
        .amar-contact-links a{color:#eef4e8;text-decoration:none;font-size:12px;display:inline-flex;align-items:center;gap:7px;border:1px solid #ffffff30;border-radius:30px;padding:10px 13px}
        .amar-contact-links a:hover{background:#ffffff12}.amar-contact>.amar-btn{position:relative;z-index:1;flex-shrink:0;background:var(--lime);color:var(--ink);border-color:var(--lime)}
        .amar-footer{border-top:1px solid #17231e18;padding:24px 0;color:#829087;font-size:11px;display:flex;justify-content:space-between;gap:12px}
        @media(max-width:850px){.amar-hero{grid-template-columns:1fr;gap:28px;padding:65px 0}.amar-visual{min-height:390px}.amar-about-grid{grid-template-columns:1fr 1fr}.amar-links{display:none}.amar-menu-button{display:inline-flex}.amar-nav{position:relative}.amar-mobile-links{position:absolute;top:calc(100% + 1px);left:0;right:0;z-index:10;display:grid;gap:4px;padding:12px;background:var(--paper);border:1px solid #17231e18;border-radius:0 0 16px 16px;box-shadow:0 15px 30px #17231e12}.amar-mobile-links a{padding:12px;color:var(--ink);text-decoration:none;font-size:13px;font-weight:700}}
        @media(max-width:560px){.amar-wrap{width:calc(100% - 30px)}.amar-nav{min-height:72px}.amar-nav-clock{gap:5px;padding:5px 7px}.amar-nav-flag{width:20px;height:29px}.amar-nav-time{font-size:9px}.amar-nav-bs{font-size:9px}.amar-nav-ad{font-size:8px}.amar-nav-right{gap:7px}.amar-nav-right>.amar-btn{display:none}.amar-hero{padding:55px 0 65px}.amar-hero h1{letter-spacing:-.065em}.amar-visual{min-height:340px}.amar-photo-card{max-width:310px}.amar-profile-photo{width:155px;height:155px}.amar-float.one{right:-3px;top:28px}.amar-float.two{left:-4px;bottom:25px}.amar-section{padding:57px 0}.amar-about-grid,.amar-project-grid{grid-template-columns:1fr}.amar-contact{padding:25px;align-items:flex-start;flex-direction:column}.amar-contact h2{font-size:27px}.amar-footer{flex-direction:column}}
        @media(prefers-reduced-motion:reduce){.amar-portfolio *{animation:none!important;transition:none!important}}
      `}</style>

      <div className="amar-wrap">
        <header className="amar-nav">
          <a className="amar-brand" href="#home" onClick={closeMenu}>
            <span className="amar-brand-mark">AB.</span>
            <span>AMAR BARTAULA<small>PORTFOLIO / NEPAL</small></span>
          </a>
          <nav className="amar-links">
            <a href="#home">Home</a><a href="#about">About</a><a href="#projects">Projects</a><a href="#skills">Skills</a><a href="#contact">Contact</a>
          </nav>
          <div className="amar-nav-right">
            <div className="amar-nav-clock" aria-label="Nepal date and time">
              <svg className="amar-nav-flag" viewBox="0 0 100 120" role="img" aria-label="Nepal flag">
                <path d="M5 3 L91 53 L31 53 L91 112 L5 112 Z" fill="#003893" stroke="#003893" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 10 L78 50 L28 50 L83 105 L9 105 Z" fill="#dc143c" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M18 35 C27 52 46 53 55 38 C50 58 24 60 18 35Z" fill="#fff"/>
                <path d="M35 65 L39 75 L50 72 L44 81 L50 90 L39 87 L35 98 L31 87 L20 90 L26 81 L20 72 L31 75Z" fill="#fff"/>
              </svg>
              <div className="amar-nav-date">
                <span className="amar-nav-time">{nepalTime} NPT</span>
                <span className="amar-nav-bs" id="mypatro_nepali_date">नेपाली मिति लोड हुँदैछ…</span>
                <span className="amar-nav-ad">{nepalDate}</span>
              </div>
            </div>
            <a className="amar-btn" href="#contact">Let’s talk <ArrowUpRight size={15}/></a>
            <button className="amar-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={19}/> : <Menu size={19}/>}</button>
          </div>
          {menuOpen && <nav className="amar-mobile-links"><a href="#home" onClick={closeMenu}>Home</a><a href="#about" onClick={closeMenu}>About</a><a href="#projects" onClick={closeMenu}>Projects</a><a href="#skills" onClick={closeMenu}>Skills</a><a href="#contact" onClick={closeMenu}>Contact</a></nav>}
        </header>

        <main>
          <section className="amar-hero" id="home">
            <div className="amar-hero-copy">
              <div className="amar-kicker"><Sparkles size={14}/> BUILDING USEFUL DIGITAL PRODUCTS</div>
              <h1>Hi, I’m<br/><span>Amar Bartaula.</span></h1>
              <p className="amar-nepali">अमर बर्तौला</p>
              <p className="amar-role">Full-stack Web Developer <span style={{color:'#9aa59d'}}>·</span> Educational Technology</p>
              <p className="amar-lead">I create practical digital solutions with a focus on software, school administration, and accounting workflows. I enjoy turning everyday challenges into clear, useful digital experiences.</p>
              <div className="amar-actions">
                <a className="amar-btn primary" href="#projects">Explore my work <ArrowUpRight size={16}/></a>
                <a className="amar-btn" href="#contact"><Mail size={15}/> Get in touch</a>
              </div>
              <div className="amar-location"><Globe2 size={14}/> Based in Nepal · Building for the web</div>
            </div>
            <div className="amar-visual" aria-label="Amar Bartaula profile">
              <div className="amar-photo-card">
                <div className="amar-photo-inner">
                  <div className="amar-photo-top"><span>Developer / Creator</span><Sparkles size={17}/></div>
                  <div>
                    <img className="amar-profile-photo" src={profilePhoto} alt="Amar Bartaula"/>
                    <div className="amar-photo-title">Ideas into<br/><span>systems.</span></div>
                    <p className="amar-photo-caption">Thoughtful design. Useful technology. Real-world impact.</p>
                  </div>
                  <div className="amar-photo-bottom"><span>Portfolio · {new Date().getFullYear()}</span><Code2 size={20}/></div>
                </div>
              </div>
              <div className="amar-float one"><Code2 size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}}/> Web development</div>
              <div className="amar-float two"><Database size={14} style={{display:'inline',verticalAlign:'middle',marginRight:6}}/> Digital systems</div>
            </div>
          </section>

          <section className="amar-section" id="about">
            <div className="amar-section-head"><div className="amar-eyebrow">01 / About</div><h2>Technology with a human purpose.</h2><p>My work focuses on turning day-to-day organizational needs into clear, dependable digital workflows — especially in education and accounting.</p></div>
            <div className="amar-about-grid">
              <article className="amar-info-card"><Code2 size={25}/><h3>Frontend Development</h3><p>Responsive interfaces, clean layouts, and practical user experiences for web applications.</p></article>
              <article className="amar-info-card"><Database size={25}/><h3>Backend & Database</h3><p>Application logic, data organization, and connecting user interfaces with backend services.</p></article>
              <article className="amar-info-card"><GraduationCap size={25}/><h3>Education Technology</h3><p>Digital workflows for student records, examinations, fees, administration, and accounting.</p></article>
            </div>
          </section>

          <section className="amar-section" id="projects">
            <div className="amar-section-head"><div className="amar-eyebrow">02 / Selected Work</div><h2>Built around real needs.</h2><p>Explore current and selected software projects. The school management system is the active project.</p></div>
            <div className="amar-filter">{filters.map(filter=><button key={filter} className={activeFilter===filter?'active':''} onClick={()=>setActiveFilter(filter)}>{filter}</button>)}</div>
            <div className="amar-project-grid">
              {visibleProjects.map(project=>{const Icon=project.icon;return <article className={`amar-project ${project.featured?'featured':''}`} key={project.title}>
                <div className="amar-project-top"><div className="amar-project-icon"><Icon size={21}/></div><span className="amar-status">{project.status}</span></div>
                <h3>{project.title}</h3><p>{project.description}</p>
                {project.featured
                  ? <a className="amar-btn primary" href={project.href}>View project <ArrowUpRight size={15}/></a>
                  : project.href
                    ? <a className="amar-btn primary" href={project.href} target={project.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">View project <ArrowUpRight size={15}/></a>
                    : <span className="amar-note">{project.category}</span>}
              </article>})}
            </div>
          </section>

          <section className="amar-section" id="skills">
            <div className="amar-section-head"><div className="amar-eyebrow">03 / Toolkit</div><h2>Tools for turning ideas into products.</h2><p>A practical toolkit for building and maintaining modern web applications.</p></div>
            <div className="amar-skill-list">{skills.map(skill=><span className="amar-skill" key={skill}>{skill}</span>)}</div>
          </section>

          <section className="amar-section" id="contact">
            <div className="amar-contact">
              <div className="amar-contact-content">
                <div className="amar-eyebrow" style={{color:'#c6ed79'}}>04 / Get in touch</div>
                <h2>Have a project in mind?</h2>
                <p>For project discussions, collaboration, or questions, feel free to reach out.</p>
                <div className="amar-contact-links">
                  <a href="tel:+9779845433722"><PhoneCall size={15}/> +977 9845433722</a>
                  <a href="mailto:amarbartaula360@gmail.com"><Mail size={15}/> Email</a>
                  <a href="https://www.facebook.com/lbartaula" target="_blank" rel="noreferrer"><Globe2 size={15}/> Facebook</a>
                  <a href="https://github.com/amarbartaula360" target="_blank" rel="noreferrer"><Code2 size={15}/> GitHub</a>
                </div>
              </div>
              <a className="amar-btn" href="mailto:amarbartaula360@gmail.com">Let’s connect <ArrowUpRight size={16}/></a>
            </div>
          </section>
        </main>

        <footer className="amar-footer"><span>© {new Date().getFullYear()} Amar Bartaula</span><span>Personal Portfolio · Software & Digital Solutions</span></footer>
      </div>
    </div>
  );
}
