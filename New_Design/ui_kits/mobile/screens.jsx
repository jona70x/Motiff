/* Screens — wired as click-thru fake. No real data, no real auth. */

const { useState } = window.React;

/* ── SignIn ───────────────────────────────────────────────────── */
function SignInScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  return (
    <Screen bg="#f6f6f8">
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:24, gap:12 }}>
        <div style={{ fontSize:32, fontWeight:700, textAlign:'center', marginBottom:4 }}>Motiff</div>
        <div style={{ fontSize:15, color:C.fg3, textAlign:'center', marginBottom:16 }}>Sign in to continue</div>
        <TextInput value={email} onChange={setEmail} placeholder="Email" type="email" />
        <TextInput value={pw} onChange={setPw} placeholder="Password" type="password" />
        <PrimaryButton onClick={onSignIn} style={{ marginTop:4 }}>Sign in</PrimaryButton>
        <div style={{ textAlign:'center' }}><GhostLink>Forgot password?</GhostLink></div>
        <div style={{ background:C.linkBg, border:`1px solid ${C.linkBorder}`, borderRadius:8, padding:14, marginTop:4 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.link, marginBottom:4 }}>Closed beta</div>
          <div style={{ fontSize:13, color:C.fg3, lineHeight:'18px' }}>Motiff is currently invite-only. If you received an invite email, tap the link in that email to set your password and sign in.</div>
        </div>
      </div>
    </Screen>
  );
}

/* ── Today ────────────────────────────────────────────────────── */
const SAMPLE_ASSIGNMENTS = [
  { id:'a1', course:'Intro to Psychology', kind:'assignment', title:'Chapter 4 response paper', due:'Due today · 11:59 PM', estMinutes:45, bucket:'today' },
  { id:'a2', course:'Linear Algebra',      kind:'exam',       title:'Midterm — chapters 1–5',     due:'Due today · 2:00 PM',  estMinutes:90, bucket:'today' },
  { id:'a3', course:'Intro to Psychology', kind:'reading',    title:'Textbook pp. 142–168',       due:'Due Thu',               estMinutes:30, bucket:'this_week' },
  { id:'a4', course:'Modern Poetry',       kind:'project',    title:'Final presentation outline', due:'Due Fri',               estMinutes:60, bucket:'this_week' },
  { id:'a5', course:'Modern Poetry',       kind:'reading',    title:'Eliot — The Waste Land',     due:'Due Apr 28',            estMinutes:45, bucket:'later' },
];

function TodayScreen({ navigate }) {
  const [items, setItems] = useState(SAMPLE_ASSIGNMENTS);
  const [laterOpen, setLaterOpen] = useState(false);
  const [undo, setUndo] = useState(null);

  const complete = (a) => { setItems(items.filter(x=>x.id!==a.id)); setUndo(a); setTimeout(()=>setUndo(null), 4000); };
  const undoIt = () => { if (undo) setItems([undo, ...items]); setUndo(null); };

  const today    = items.filter(i=>i.bucket==='today');
  const thisWeek = items.filter(i=>i.bucket==='this_week');
  const later    = items.filter(i=>i.bucket==='later');

  const section = (title, arr, empty) => (
    <div style={{ marginBottom:12 }}>
      <SectionHeader title={title} count={arr.length} />
      {arr.length===0
        ? <div style={{ fontSize:13, color:C.fg7, padding:'8px 20px', fontStyle:'italic' }}>{empty}</div>
        : arr.map(a => <AssignmentCard key={a.id} {...a} onComplete={()=>complete(a)} onStartFocus={()=>navigate('focus', a)} />)}
    </div>
  );

  return (
    <Screen>
      <Header title="Today" />
      <div style={{ flex:1, overflow:'auto', padding:'12px 0', position:'relative' }}>
        {section('Today', today, 'Nothing due today')}
        {section('This week', thisWeek, 'Nothing due this week')}
        <div style={{ marginBottom:12 }}>
          <div onClick={()=>setLaterOpen(v=>!v)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px 6px', cursor:'pointer' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.fg2, textTransform:'uppercase', letterSpacing:0.5 }}>Later {laterOpen?'▾':'▸'}</div>
            <div style={{ fontSize:13, color:C.fg7 }}>{later.length}</div>
          </div>
          {laterOpen && later.map(a => <AssignmentCard key={a.id} {...a} onComplete={()=>complete(a)} onStartFocus={()=>navigate('focus', a)} />)}
        </div>
      </div>
      {undo && (
        <div style={{ position:'absolute', left:16, right:16, bottom:80, background:C.undo, color:'#fff', borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14 }}>Marked as done</span>
          <button onClick={undoIt} style={{ background:'transparent', border:0, color:'#7eb8ff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Undo</button>
        </div>
      )}
    </Screen>
  );
}

/* ── Plan ─────────────────────────────────────────────────────── */
const PLAN_BLOCKS = [
  { position:1, course:'Linear Algebra',      title:'Midterm study — chapters 1–5',       allocatedMinutes:45, dueLabel:'Due today',     dueColor:'#e65100' },
  { position:2, course:'Intro to Psychology', title:'Chapter 4 response paper',           allocatedMinutes:30, dueLabel:'Due today',     dueColor:'#e65100' },
  { position:3, course:'Modern Poetry',       title:'Final presentation outline',         allocatedMinutes:20, dueLabel:'Due this week', dueColor:'#1565c0' },
];
function PlanScreen({ navigate }) {
  return (
    <Screen>
      <Header title="Plan" subtitle="95 min today" right={
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <GhostLink>↺ Regenerate</GhostLink>
          <span style={{ fontSize:20, color:C.fg3 }}>⚙</span>
        </div>
      } />
      <div style={{ flex:1, overflow:'auto', padding:'12px 0' }}>
        <div style={{ fontSize:11, color:C.fg8, fontWeight:500, textTransform:'uppercase', letterSpacing:0.5, padding:'0 20px 8px' }}>Prioritised by urgency · 90 min budget</div>
        {PLAN_BLOCKS.map(b => <PlanBlockCard key={b.position} {...b} onStartFocus={()=>navigate('focus', { title:b.title, course:b.course })} />)}
      </div>
    </Screen>
  );
}

/* ── Courses ──────────────────────────────────────────────────── */
const COURSES = [
  { id:'c1', title:'Intro to Psychology', term:'Spring 2026' },
  { id:'c2', title:'Linear Algebra',      term:'Spring 2026' },
  { id:'c3', title:'Modern Poetry',       term:'Spring 2026' },
  { id:'c4', title:'Intro to Python',     term:'Fall 2025', completed:true },
];
function CoursesScreen({ navigate }) {
  const active = COURSES.filter(c=>!c.completed);
  const done = COURSES.filter(c=>c.completed);
  return (
    <Screen>
      <Header title="Courses" right={<SoftChip>Sign Out</SoftChip>} />
      <div style={{ flex:1, overflow:'auto', paddingBottom:96, position:'relative' }}>
        <div style={{ padding:'20px 20px 8px', fontSize:11, fontWeight:600, color:C.fg8, textTransform:'uppercase', letterSpacing:0.5 }}>Active</div>
        {active.map(c => <CourseCard key={c.id} {...c} onPress={()=>navigate('courseDetail', c)} />)}
        <div style={{ padding:'20px 20px 8px', fontSize:11, fontWeight:600, color:C.fg8, textTransform:'uppercase', letterSpacing:0.5 }}>Completed</div>
        {done.map(c => <CourseCard key={c.id} {...c} onPress={()=>navigate('courseDetail', c)} />)}
      </div>
      <FAB onClick={()=>navigate('addCourse')} />
    </Screen>
  );
}

/* ── Progress ─────────────────────────────────────────────────── */
const WEEK = [
  { label:'M', minutes:45, isToday:false },
  { label:'T', minutes:60, isToday:false },
  { label:'W', minutes:30, isToday:false },
  { label:'T', minutes:90, isToday:false },
  { label:'F', minutes:0,  isToday:false },
  { label:'S', minutes:50, isToday:false },
  { label:'S', minutes:25, isToday:true  },
];
function ProgressScreen() {
  return (
    <Screen>
      <Header title="Progress" />
      <div style={{ flex:1, overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.fg6, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>This week</div>
          <WeekBarChart days={WEEK} />
          <div style={{ fontSize:13, color:C.fg4, marginTop:4 }}>300 min focused this week</div>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.fg6, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Assignments</div>
          <div style={{ fontSize:36, fontWeight:700, color:C.fg1 }}>7</div>
          <div style={{ fontSize:13, color:C.fg6 }}>completed this week</div>
        </div>
        <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.fg6, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>By course</div>
          {[
            { t:'Linear Algebra', m:120 },
            { t:'Intro to Psychology', m:95 },
            { t:'Modern Poetry', m:85 },
          ].map((r,i) => (
            <div key={r.t} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop: i===0?0:`1px solid ${C.hair}` }}>
              <div style={{ fontSize:14, color:C.fg1, fontWeight:500 }}>{r.t}</div>
              <div style={{ fontSize:14, color:C.fg3, fontWeight:600 }}>{r.m} min</div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

/* ── Focus Timer ──────────────────────────────────────────────── */
function FocusTimerScreen({ assignment, onBack }) {
  const [paused, setPaused] = useState(false);
  return (
    <div style={{ height:'100%', background:C.dark, display:'flex', flexDirection:'column', fontFamily:fontStack }}>
      <div style={{ padding:'16px 20px', display:'flex', justifyContent:'flex-end' }}>
        <span onClick={onBack} style={{ color:C.fg6, fontSize:16, fontWeight:500, cursor:'pointer' }}>Cancel</span>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:40, padding:'0 32px' }}>
        <div style={{ fontSize:17, fontWeight:600, color:'#ccc', textAlign:'center', lineHeight:'24px' }}>{assignment?.title || 'Focus session'}</div>
        <div style={{ width:220, height:220, borderRadius:110, border:`4px solid ${paused?C.fg3:'#fff'}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
          <div style={{ fontSize:52, fontWeight:200, color:'#fff', letterSpacing:2, fontVariantNumeric:'tabular-nums' }}>24:37</div>
          {paused && <div style={{ fontSize:11, fontWeight:700, color:'#666', letterSpacing:2 }}>PAUSED</div>}
        </div>
        <button onClick={()=>setPaused(p=>!p)}
          style={{ background: paused?C.link:'#fff', color: paused?'#fff':C.dark, border:0, borderRadius:30, padding:'16px 48px', minWidth:160, fontSize:17, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>
          {paused?'Resume':'Pause'}
        </button>
        <div style={{ color:C.fg6, fontSize:14, fontWeight:500, textDecoration:'underline', cursor:'pointer' }}>Done with this assignment</div>
      </div>
    </div>
  );
}

/* ── Onboarding (single slide preview) ───────────────────────── */
function OnboardingScreen({ onDone }) {
  const [i, setI] = useState(0);
  const slides = [
    { icon:'📚', title:'Welcome to Motiff', body:'Your all-in-one academic companion — built for students who want to stay on top of their studies without the chaos.' },
    { icon:'🗂️', title:'Track every course', body:'Add your courses and upload syllabi. Motiff extracts assignments and due dates automatically so nothing slips through.' },
    { icon:'⏱️', title:'Focus, then recharge', body:'A built-in Pomodoro timer keeps you in the zone. Set a daily study budget and watch your streaks grow.' },
    { icon:'🔔', title:'Never miss a deadline', body:'Enable notifications and Motiff will remind you about upcoming assignments — so you can focus on studying, not remembering.' },
  ];
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <Screen>
      <div style={{ padding:'8px 24px', display:'flex', justifyContent:'flex-end', minHeight:40 }}>
        {!last && <span onClick={onDone} style={{ color:C.link, fontSize:15, fontWeight:500, cursor:'pointer' }}>Skip</span>}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 40px', gap:20, textAlign:'center' }}>
        <div style={{ fontSize:80, marginBottom:8 }}>{s.icon}</div>
        <div style={{ fontSize:26, fontWeight:700, color:C.fg1, lineHeight:'34px' }}>{s.title}</div>
        <div style={{ fontSize:16, color:C.fg3, lineHeight:'24px' }}>{s.body}</div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'20px 0' }}>
        {slides.map((_, idx) => (
          <div key={idx} style={{ width: idx===i?20:8, height:8, borderRadius:4, background: idx===i?C.fg1:'#d6d6dc', transition:'width 200ms' }} />
        ))}
      </div>
      <div style={{ padding:'0 24px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        {last ? (
          <React.Fragment>
            <PrimaryButton onClick={onDone} style={{ padding:'14px' }}>Enable notifications</PrimaryButton>
            <div style={{ textAlign:'center' }}><span onClick={onDone} style={{ color:C.fg6, fontSize:15, cursor:'pointer' }}>Maybe later</span></div>
          </React.Fragment>
        ) : (
          <PrimaryButton onClick={()=>setI(i+1)} style={{ padding:'14px' }}>Next</PrimaryButton>
        )}
      </div>
    </Screen>
  );
}

Object.assign(window, { SignInScreen, TodayScreen, PlanScreen, CoursesScreen, ProgressScreen, FocusTimerScreen, OnboardingScreen });
