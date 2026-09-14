/* Motiff mobile UI components (cosmetic — not wired to a real backend). */

const { useState } = React;

const C = {
  fg1:'#111', fg2:'#333', fg3:'#555', fg4:'#666', fg5:'#777', fg6:'#888',
  fg7:'#999', fg8:'#aaa', fg9:'#bbb',
  bg:'#f6f6f8', surface:'#fff', surface2:'#fafafa', press:'#f0f0f4',
  chip:'#f0f0f5', dark:'#0a0a0a', undo:'#222',
  border:'#e0e0e6', border2:'#e8e8ee', borderInput:'#d6d6dc', hair:'#f0f0f4',
  red:'#b00020', redBg:'#ffebee',
  orange:'#e65100',
  blue:'#1565c0', blueBg:'#e3f2fd',
  purple:'#6a1b9a', purpleBg:'#f3e5f5',
  green:'#2e7d32', greenBg:'#e8f5e9',
  link:'#3355cc', linkBg:'#f0f4ff', linkBorder:'#c8d4f5',
  warnBg:'#fff8e1', warnBorder:'#ffe082', warnFg:'#795548',
  otherBg:'#f5f5f5',
};

const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, "Helvetica Neue", Arial, sans-serif';

/* ── Screen shell ─────────────────────────────────────────────── */
function Screen({ children, bg = C.bg }) {
  return (
    <div style={{ height:'100%', background:bg, fontFamily:fontStack, color:C.fg1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {children}
    </div>
  );
}

function Header({ title, right, subtitle }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'16px 20px', background:'#fff', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <div style={{ fontSize:28, fontWeight:700, color:C.fg1, lineHeight:1 }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:C.fg6, fontWeight:500 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px 6px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.fg2, textTransform:'uppercase', letterSpacing:0.5 }}>{title}</div>
      {count != null && <div style={{ fontSize:13, fontWeight:500, color:C.fg7 }}>{count}</div>}
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────────── */
function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background:C.fg1, color:'#fff', border:0, borderRadius:8, padding:'14px 20px', fontSize:15, fontWeight:600, fontFamily:'inherit', cursor:'pointer', opacity: disabled?0.5:1, ...style }}>
      {children}
    </button>
  );
}
function ChipButton({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background:C.fg1, color:'#fff', border:0, borderRadius:6, padding:'6px 12px', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>
      {children}
    </button>
  );
}
function SoftChip({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background:C.chip, color:C.fg1, border:0, borderRadius:6, padding:'8px 12px', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>
      {children}
    </button>
  );
}
function GhostLink({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background:'transparent', color:C.link, border:0, padding:'4px 0', fontSize:14, fontWeight:500, fontFamily:'inherit', cursor:'pointer' }}>
      {children}
    </button>
  );
}
function FAB({ onClick }) {
  return (
    <button onClick={onClick}
      aria-label="Add"
      style={{ position:'absolute', bottom:80, right:24, width:56, height:56, borderRadius:28, background:C.fg1, color:'#fff', fontSize:28, fontWeight:300, border:0, cursor:'pointer', boxShadow:'0 2px 3.84px rgba(0,0,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', paddingBottom:2 }}>
      +
    </button>
  );
}

/* ── Kind badge ───────────────────────────────────────────────── */
const KIND = {
  exam:       { bg:C.redBg, fg:C.red },
  assignment: { bg:C.blueBg, fg:C.blue },
  project:    { bg:C.purpleBg, fg:C.purple },
  reading:    { bg:C.greenBg, fg:C.green },
  other:      { bg:C.otherBg, fg:'#555' },
};
function KindBadge({ kind }) {
  const k = KIND[kind] || KIND.other;
  return (
    <span style={{ background:k.bg, color:k.fg, borderRadius:4, padding:'2px 6px', fontSize:11, fontWeight:600, textTransform:'capitalize' }}>{kind}</span>
  );
}

/* ── Cards ────────────────────────────────────────────────────── */
function AssignmentCard({ course, kind, title, due, estMinutes, overdue, onComplete, onStartFocus, onPress }) {
  return (
    <div onClick={onPress}
      style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:14, margin:'4px 16px', display:'flex', flexDirection:'column', gap:6, cursor:'pointer' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ flex:1, fontSize:11, fontWeight:600, color:C.fg6, textTransform:'uppercase', letterSpacing:0.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{course}</div>
        {kind && <KindBadge kind={kind} />}
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:C.fg1, lineHeight:'20px' }}>{title}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginTop:2 }}>
        <div style={{ display:'flex', gap:8, fontSize:12, fontWeight:500 }}>
          {estMinutes != null && <span style={{ color:C.fg4 }}>~{estMinutes} min</span>}
          {due && <span style={{ color: overdue?C.red:C.fg3, fontWeight: overdue?600:500 }}>{due}</span>}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={(e)=>{e.stopPropagation();onComplete&&onComplete();}}
            aria-label="Mark done"
            style={{ width:32, height:32, borderRadius:16, border:`1.5px solid ${C.fg9}`, background:'#fff', color:C.fg3, fontSize:14, fontWeight:600, cursor:'pointer' }}>✓</button>
          <button onClick={(e)=>{e.stopPropagation();onStartFocus&&onStartFocus();}}
            style={{ background:C.fg1, color:'#fff', borderRadius:6, padding:'6px 12px', fontSize:12, fontWeight:600, border:0, cursor:'pointer' }}>Start Focus</button>
        </div>
      </div>
    </div>
  );
}

function PlanBlockCard({ position, course, title, allocatedMinutes, dueLabel, dueColor, onStartFocus }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:14, margin:'5px 16px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:14, background:C.fg1, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>{position}</div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.fg6, textTransform:'uppercase', letterSpacing:0.5 }}>{course}</div>
          <div style={{ fontSize:12, fontWeight:600, color:C.fg3, marginLeft:8 }}>◷ {allocatedMinutes} min</div>
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:C.fg1, lineHeight:'20px', marginLeft:38 }}>{title}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginLeft:38 }}>
        <div style={{ fontSize:12, fontWeight:500, color: dueColor || C.fg6 }}>{dueLabel}</div>
        <button onClick={onStartFocus}
          style={{ background:C.fg1, color:'#fff', borderRadius:6, padding:'6px 12px', fontSize:12, fontWeight:600, border:0, cursor:'pointer' }}>Start Focus</button>
      </div>
    </div>
  );
}

function CourseCard({ title, term, completed, onPress }) {
  return (
    <div onClick={onPress}
      style={{ display:'flex', alignItems:'center', margin:'5px 16px', padding:'14px 16px', background: completed?C.surface2:'#fff', border:`1px solid ${completed?C.border2:C.border}`, borderRadius:12, cursor:'pointer' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
        <div style={{ fontSize:16, fontWeight:600, color: completed?C.fg6:C.fg1 }}>{title}</div>
        {term && <div style={{ fontSize:13, color:C.fg5 }}>{term}</div>}
      </div>
      <div style={{ padding:8, marginLeft:8, color:C.fg9, fontSize:16, letterSpacing:1 }}>•••</div>
    </div>
  );
}

/* ── Inputs ───────────────────────────────────────────────────── */
function TextInput({ value, onChange, placeholder, type='text' }) {
  return (
    <input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{ background:'#fff', border:`1px solid ${C.borderInput}`, borderRadius:8, padding:12, fontSize:16, fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' }} />
  );
}

/* ── Tab bar ──────────────────────────────────────────────────── */
const TAB_GLYPH = { Today:'●', Plan:'▦', Courses:'▤', Progress:'▨' };
function TabBar({ active, onChange }) {
  return (
    <div style={{ display:'flex', background:'#fff', borderTop:`1px solid ${C.border}`, paddingBottom:18 }}>
      {['Today','Plan','Courses','Progress'].map((t) => (
        <div key={t} onClick={()=>onChange(t)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 0 4px', cursor:'pointer', color: active===t?C.fg1:C.fg7 }}>
          <div style={{ fontSize:20, lineHeight:1 }}>{TAB_GLYPH[t]}</div>
          <div style={{ fontSize:10, fontWeight:500 }}>{t}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Weekly bar chart (simple) ────────────────────────────────── */
function WeekBarChart({ days }) {
  const max = Math.max(...days.map(d=>d.minutes), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, padding:'8px 0' }}>
      {days.map((d) => {
        const h = Math.max(4, Math.round((d.minutes/max)*100));
        return (
          <div key={d.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:10, color:C.fg7, height:14 }}>{d.minutes>0?d.minutes:''}</div>
            <div style={{ height:100, width:'100%', display:'flex', justifyContent:'center', alignItems:'flex-end' }}>
              <div style={{ width:'80%', height:h, borderRadius:4, background: d.isToday?C.fg1:'#ddd' }} />
            </div>
            <div style={{ fontSize:11, fontWeight: d.isToday?700:500, color: d.isToday?C.fg1:C.fg7 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* Export components to global scope for other scripts */
Object.assign(window, {
  C, fontStack,
  Screen, Header, SectionHeader,
  PrimaryButton, ChipButton, SoftChip, GhostLink, FAB,
  KindBadge, AssignmentCard, PlanBlockCard, CourseCard,
  TextInput, TabBar, WeekBarChart,
});
