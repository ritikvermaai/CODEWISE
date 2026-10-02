import React,{useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{Brain,Plus,Search,Paperclip,Image as ImageIcon,Send,Moon,Sun,LogOut,Settings,ChevronDown,X,Trash2,Menu,MessageSquare,GraduationCap,Lightbulb,Bug,Mic,AlertTriangle,Check,Square,Info,Mail,KeyRound,Shield,Monitor,Users}from"lucide-react";import{api}from"./api";import"./styles.css";

const escapeHtml=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
function renderInline(value){
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const source=String(value??"");
  const parts=[];
  const pattern=/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
  let last=0; let match;
  while((match=pattern.exec(source))){
    if(match.index>last) parts.push(source.slice(last,match.index));
    const token=match[0];
    if(token.startsWith("`")&&token.endsWith("`")) parts.push(<code key={parts.length}>{token.slice(1,-1)}</code>);
    else if((token.startsWith("**")&&token.endsWith("**"))||(token.startsWith("__")&&token.endsWith("__"))) parts.push(<strong key={parts.length}>{token.slice(2,-2)}</strong>);
    else if(token.startsWith("*")&&token.endsWith("*")) parts.push(<em key={parts.length}>{token.slice(1,-1)}</em>);
    last=match.index+token.length;
  }
  if(last<source.length) parts.push(source.slice(last));
  return parts.length?parts:source;
}
function RichText({value}){
  const lines=String(value??"").replace(/\r/g,"").split("\n");
  const blocks=[]; let list=[];
  const flush=()=>{if(!list.length)return;blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((item,i)=><li key={i}>{renderInline(item)}</li>)}</ul>);list=[];};
  lines.forEach((raw,i)=>{
    const line=String(raw??"").trimEnd();
    if(!line.trim()){flush();blocks.push(<div className="md-spacer" key={`sp-${i}`}/>);return;}
    const heading=line.match(/^#{1,6}\s+(.+)$/);
    if(heading){flush();const level=Math.min(6,(heading[0].match(/^#+/)||["#"])[0].length);const Tag=`h${level}`;blocks.push(<Tag key={`h-${i}`}>{renderInline(heading[1])}</Tag>);return;}
    const bullet=line.match(/^[-*+]\s+(.+)$/);
    if(bullet){list.push(bullet[1]);return;}
    flush();
    const clean=line.replace(/^---+$/g,"").trim();
    if(clean)blocks.push(<p key={`p-${i}`}>{renderInline(clean)}</p>);
  });
  flush();
  return <div className="rich-text">{blocks}</div>;
}
const VALID_MODES=new Set(["Teacher","Explain","Hint","Interview","Debug"]);
const safeName=user=>String(user?.name||"User").trim()||"User";
const safeId=value=>{const s=String(value??"").trim();return s||null};
const safeMode=value=>VALID_MODES.has(String(value))?String(value):"Teacher";
const safeMessage=(m,index=0)=>({
  role:m?.role==="model"?"model":"user",
  mode:safeMode(m?.mode),
  text:typeof m?.text==="string"?m.text:String(m?.text??""),
  attachments:Array.isArray(m?.attachments)?m.attachments.map((a)=>({
    name:String(a?.name||"Attachment"),
    mimeType:String(a?.mimeType||""),
    size:Number(a?.size||0),
    previewUrl:typeof a?.previewUrl==="string"?a.previewUrl:""
  })):[],
  createdAt:m?.createdAt?String(m.createdAt):new Date().toISOString(),
  id:safeId(m?.id)||`local-${index}`
});
const safeChat=(c,index=0)=>({
  id:safeId(c?.id)||`chat-${index}`,
  title:typeof c?.title==="string"&&c.title.trim()?c.title:"New chat",
  mode:safeMode(c?.mode),
  preview:typeof c?.preview==="string"?c.preview:"",
  updatedAt:c?.updatedAt?String(c.updatedAt):""
});
class MessageBoundary extends React.Component{
  constructor(props){super(props);this.state={failed:false};}
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error,info){console.error("CodeWise message render error",error,info);}
  render(){
    if(this.state.failed)return <div className="message-render-fallback"><AlertTriangle size={14}/><span>This message could not be displayed. Reopen the chat to try again.</span></div>;
    return this.props.children;
  }
}
const TRY_NEXT=[
  {label:"Explain visually",prompt:"Explain the same concept visually with a simple step-by-step example."},
  {label:"Harder example",prompt:"Give me a harder example of this concept and walk through it step by step."},
  {label:"Interview question",prompt:"Give me an interview-style question based on this concept. Do not reveal the answer immediately."},
  {label:"Optimized solution",prompt:"Show me the optimized solution for this problem and explain the time and space complexity."},
  {label:"Quiz me",prompt:"Quiz me on this concept with one question at a time. Wait for my answer before continuing."}
];
function MessageView({message,user,onTryNext,index}){
  const m=safeMessage(message); const name=safeName(user); const initial=name.charAt(0).toUpperCase();
  return <div className={`message ${m.role}`} data-conversation-message={index}>
    <div className="msg-icon">{m.role==="model"?<Brain size={13}/>:initial}</div>
    <div>
      <div className="meta">{m.role==="model"?"CodeWise":name} · {m.mode}</div>
      <div className="text"><RichText value={m.text}/></div>
      {m.attachments.length>0&&<div className="sent-attachments" aria-label="Sent attachments">
        {m.attachments.map((a,i)=><div className="sent-attachment" key={`${a.name}-${i}`}>
          {a.previewUrl&&a.mimeType.startsWith("image/")?<img src={a.previewUrl} alt={a.name}/>:<span className="attachment-icon">{a.mimeType.startsWith("image/")?<ImageIcon size={15}/>:<Paperclip size={15}/>}</span>}
          <span className="attachment-info"><b>{a.name}</b><small>{a.mimeType||"File"}</small></span>
        </div>)}
      </div>}
      {m.role==="model"&&onTryNext&&<div className="try-next" aria-label="Try this next">
        <div className="try-next-title">Try this next</div>
        <div className="try-next-actions">
          {TRY_NEXT.map(item=><button key={item.label} type="button" onClick={()=>onTryNext(item.prompt)}>{item.label}</button>)}
        </div>
      </div>}
    </div>
  </div>;
}
const MODES=[{name:"Teacher",icon:GraduationCap,desc:"Socratic DSA teacher"},{name:"Explain",icon:Brain,desc:"Clear concept teaching"},{name:"Hint",icon:Lightbulb,desc:"Small next step"},{name:"Interview",icon:MessageSquare,desc:"Interview practice"},{name:"Debug",icon:Bug,desc:"Debug reasoning"}];
function Dialog({dialog,onClose,onConfirm,nameDraft,setNameDraft,busy}){if(!dialog)return null;const isName=dialog.type==="name";return <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className={`dialog-icon ${isName?"":"danger-icon"}`}>{isName?<Settings size={19}/>:<AlertTriangle size={19}/>}</div><div className="dialog-content"><h2 id="dialog-title">{isName?"Manage account":"Delete account"}</h2>{isName?<><p>Update the name shown across your CodeWise workspace.</p><label className="dialog-label">Display name<input autoFocus value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={80} /></label></>:<p>This will permanently delete your CodeWise account and all associated chats. This action cannot be undone.</p>}<div className="dialog-actions"><button className="dialog-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className={isName?"dialog-primary":"dialog-danger"} disabled={busy|| (isName&&!nameDraft.trim())} onClick={onConfirm}>{busy?"Saving…":isName?"Save changes":"Delete account"}</button></div></div></div></div>}
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error}; }
  componentDidCatch(error,info){ console.error("CodeWise UI error",error,info); }
  render(){
    if(this.state.hasError){
      return <div className="app-crash"><div className="app-crash-card"><div className="app-crash-icon"><AlertTriangle size={22}/></div><h1>CodeWise is still running</h1><p>Something went wrong while displaying this message. Your session is safe. Refresh the page and try again.</p><button onClick={()=>window.location.reload()}>Refresh CodeWise</button></div></div>;
    }
    return this.props.children;
  }
}
function Auth({onDone}){const[screen,setScreen]=useState("login"),[f,setF]=useState({name:"",email:"",password:"",otp:"",newPassword:""}),[err,setErr]=useState(""),[info,setInfo]=useState(""),[busy,setBusy]=useState(false),[theme,setTheme]=useState(localStorage.getItem("theme")||"dark");useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("theme",theme)},[theme]);const update=(k,v)=>setF(x=>({...x,[k]:v}));async function run(fn){setBusy(true);setErr("");setInfo("");try{return await fn()}catch(e){setErr(e.message)}finally{setBusy(false)}}async function submit(e){e.preventDefault();if(screen==="register")return run(async()=>{const d=await api.register({name:f.name,email:f.email,password:f.password});setScreen("verify");setInfo(d.message||"Check your email for the OTP.")});if(screen==="login")return run(async()=>{const d=await api.login({email:f.email,password:f.password});localStorage.setItem("codewise_token",d.token);localStorage.setItem("codewise_user",JSON.stringify(d.user));onDone(d.user)});if(screen==="verify")return run(async()=>{const d=await api.verifyEmail({email:f.email,otp:f.otp});localStorage.setItem("codewise_token",d.token);localStorage.setItem("codewise_user",JSON.stringify(d.user));onDone(d.user)});if(screen==="forgot")return run(async()=>{const d=await api.forgotPassword({email:f.email});setScreen("reset");setInfo(d.message||"Check your email for the reset OTP.")});if(screen==="reset")return run(async()=>{await api.resetPassword({email:f.email,otp:f.otp,password:f.newPassword});setScreen("login");setInfo("Password reset successfully. You can sign in now.")})}const title=screen==="register"?"Create account":screen==="verify"?"Verify your email":screen==="forgot"?"Forgot password":screen==="reset"?"Reset password":"Welcome back";return <div className="auth"><div className="auth-orbit auth-orbit-one"></div><div className="auth-orbit auth-orbit-two"></div><div className="auth-grid"></div><div className="auth-card"><button type="button" className="auth-theme-toggle" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={`Switch to ${theme==="dark"?"light":"dark"} theme`} title={`Switch to ${theme==="dark"?"light":"dark"} theme`}>{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}<span>{theme==="dark"?"Light":"Dark"}</span></button><div className="auth-brand"><div className="auth-brand-mark"><Brain size={28}/></div><div><b>CodeWise</b><span>Learn. Think. Solve.</span></div></div><h1>{title}</h1><p>{screen==="verify"?<>We sent a 6-digit code to <b>{f.email}</b>.</>:screen==="reset"?<>Enter the 6-digit code sent to <b>{f.email}</b> and choose a new password.</>:"A private AI teacher that helps you learn how to think through DSA."}</p><form onSubmit={submit}>{screen==="register"&&<input placeholder="Name" required value={f.name} onChange={e=>update("name",e.target.value)}/>} {(screen!=="verify"&&screen!=="reset")&&<input type="email" placeholder="Email" required value={f.email} onChange={e=>update("email",e.target.value)}/>} {(screen==="login"||screen==="register")&&<input type="password" placeholder="Password" minLength="8" required value={f.password} onChange={e=>update("password",e.target.value)}/>} {(screen==="verify"||screen==="reset")&&<><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="6-digit OTP" required value={f.otp} onChange={e=>update("otp",e.target.value.replace(/\D/g,"").slice(0,6))}/><div className="otp-spam-notice" role="note">Can’t find the OTP? Check your Spam/Junk folder if it isn’t in your inbox.</div></>} {screen==="reset"&&<input type="password" placeholder="New password (8+ characters)" minLength="8" required value={f.newPassword} onChange={e=>update("newPassword",e.target.value)}/>} {err&&<div className="error">{err}</div>}{info&&<div className="info">{info}</div>}<button className="primary">{busy?"Please wait…":screen==="register"?"Create account":screen==="verify"?"Verify email":screen==="forgot"?"Send OTP":screen==="reset"?"Reset password":"Sign in"}</button></form>{screen==="verify"&&<button className="link" disabled={busy} onClick={()=>run(async()=>{const d=await api.resendOtp({email:f.email});setInfo(d.message)})}>Resend OTP</button>}{screen==="login"&&<><button className="link" onClick={()=>{setErr("");setInfo("");setScreen("forgot")}}>Forgot password?</button><button className="link" onClick={()=>{setErr("");setInfo("");setScreen("register")}}>Create a new account</button></>}{screen==="register"&&<button className="link" onClick={()=>setScreen("login")}>Already have an account? Sign in</button>}{(screen==="verify"||screen==="forgot"||screen==="reset")&&<button className="link" onClick={()=>{setErr("");setInfo("");setScreen("login")}}>Back to sign in</button>}</div></div>}
function App(){const[user,setUser]=useState(()=>JSON.parse(localStorage.getItem("codewise_user")||"null")),[theme,setTheme]=useState(localStorage.getItem("theme")||"dark");useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("theme",theme)},[theme]);useEffect(()=>{const onExpired=()=>setUser(null);window.addEventListener("codewise:auth-expired",onExpired);return()=>window.removeEventListener("codewise:auth-expired",onExpired)},[]);if(!user)return <Auth onDone={setUser}/>;const logout=()=>{localStorage.removeItem("codewise_token");localStorage.removeItem("dsa_token");localStorage.removeItem("codewise_user");setUser(null)};return <Workspace user={user} theme={theme} setTheme={setTheme} logout={logout}/>}

function SettingsPage({user,theme,setTheme,onBack,onLogout,onDelete,busy,error}){
  const[name,setName]=useState(user.name||"");
  const[newEmail,setNewEmail]=useState("");
  const[emailPassword,setEmailPassword]=useState("");
  const[currentPassword,setCurrentPassword]=useState("");
  const[newPassword,setNewPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[message,setMessage]=useState("");
  const[working,setWorking]=useState(false);

  const run=async(fn,success)=>{
    setMessage("");
    setWorking(true);
    try{await fn();setMessage(success)}
    catch(e){setMessage(e?.message||"Something went wrong")}
    finally{setWorking(false)}
  };

  return <div className="settings-page">
    <div className="settings-head">
      <div>
        <button className="settings-back" onClick={onBack}>← Back to chat</button>
        <h1>Settings</h1>
        <p>Manage your CodeWise profile, security and sessions.</p>
      </div>
      <div className="settings-id"><small>User ID</small><code>{user.id}</code></div>
    </div>

    {(error||message)&&<div className={`settings-message ${error?"error":""}`}>{error||message}</div>}

    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-card-icon"><Settings size={18}/></div>
        <div><h2>Profile</h2><p>Change the name displayed across CodeWise.</p></div>
        <label>Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label>
        <button disabled={working||busy||!name.trim()} onClick={()=>run(async()=>{
          const d=await api.updateAccount({name:name.trim()});
          const updated={...user,name:d?.account?.name||name.trim()};
          localStorage.setItem("codewise_user",JSON.stringify(updated));
          window.location.reload();
        },"Name updated.")}>Save name</button>
      </section>

      <section className="settings-card">
        <div className="settings-card-icon"><Mail size={18}/></div>
        <div><h2>Change email</h2><p>Current email: <b>{user.email}</b></p></div>
        <label>New email<input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="new@email.com"/></label>
        <label>Current password<input type="password" value={emailPassword} onChange={e=>setEmailPassword(e.target.value)} placeholder="Current password"/></label>
        <button disabled={working||busy||!newEmail||!emailPassword} onClick={()=>run(async()=>{
          await api.changeEmail({currentPassword:emailPassword,newEmail});
          onLogout();
        },"Email updated. Please sign in again.")}>Change email</button>
      </section>

      <section className="settings-card">
        <div className="settings-card-icon"><KeyRound size={18}/></div>
        <div><h2>Change password</h2><p>Your account will be signed out after the password changes.</p></div>
        <label>Current password<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
        <label>New password<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="8+ characters"/></label>
        <label>Confirm new password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>
        <button disabled={working||busy||newPassword.length<8||newPassword!==confirmPassword} onClick={()=>run(async()=>{
          await api.changePassword({currentPassword,newPassword});
          onLogout();
        },"Password changed. Please sign in again.")}>Change password</button>
      </section>

      <section className="settings-card">
        <div className="settings-card-icon"><Monitor size={18}/></div>
        <div><h2>Active sessions</h2><p>Manage sessions connected to this CodeWise account.</p></div>
        <div className="session-row"><span className="session-dot"/><div><b>Current browser</b><small>Active now</small></div></div>
        <button disabled={working||busy} onClick={()=>run(async()=>{
          await api.logoutAllDevices();
          onLogout();
        },"All devices have been signed out.")}>Log out from all devices</button>
      </section>

      <section className="settings-card">
        <div className="settings-card-icon"><Shield size={18}/></div>
        <div><h2>Appearance</h2><p>Choose your preferred CodeWise theme.</p></div>
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?"Switch to light theme":"Switch to dark theme"}</button>
      </section>

      <section className="settings-card settings-danger">
        <div className="settings-card-icon"><LogOut size={18}/></div>
        <div><h2>Account actions</h2><p>Sign out from this browser or permanently delete your account.</p></div>
        <div className="settings-actions">
          <button onClick={onLogout}>Sign out</button>
          <button className="danger-action" onClick={onDelete}>Delete account</button>
        </div>
      </section>
    </div>
  </div>;
}

function AboutPage({onBack}){
  const team=[
    {name:"Ritik Verma",role:"Team Lead & Full-Stack Developer",desc:"Leads CodeWise development across product architecture, frontend and backend."},
    {name:"Rudransh Tomar",role:"Backend & API Engineer",desc:"Focuses on server architecture, APIs, authentication and data services."},
    {name:"Adarsh Tiwari",role:"Frontend Engineer & UI Specialist",desc:"Builds responsive interfaces and polished interaction experiences."},
    {name:"Riddhi Goswami",role:"AI & Algorithms Lead",desc:"Focuses on intelligent learning experiences, DSA workflows and AI-assisted features."},
    {name:"Rudrika Chaurasia",role:"Product & UX Designer",desc:"Shapes user journeys, usability and the overall product experience."},
    {name:"Ravi Pratap",role:"QA & DevOps Engineer",desc:"Focuses on testing, reliability, deployment and production readiness."}
  ];
  return <div className="about-page">
    <button className="settings-back" onClick={onBack}>← Back to chat</button>
    <div className="about-hero">
      <div className="about-logo"><Brain size={28}/></div>
      <div><h1>About CodeWise</h1><p>Learn. Think. Solve.</p></div>
    </div>
    <p className="about-copy">CodeWise is a collaborative learning platform designed to make DSA practice more interactive through guided teaching, explanations, hints, interview practice and debugging.</p>
    <div className="about-section-heading"><h2>The Team</h2><p>A focused team building the CodeWise experience.</p></div>
    <div className="team-grid">{team.map(member=><article className="team-card" key={member.name}>
      <div className="team-avatar">{member.name.charAt(0)}</div>
      <div className="team-card-body"><h3>{member.name}</h3><strong>{member.role}</strong><p>{member.desc}</p></div>
    </article>)}</div>
  </div>;
}
function Workspace({user,theme,setTheme,logout}){const[chats,setChats]=useState([]),[active,setActive]=useState(null),[messages,setMessages]=useState([]),[mode,setMode]=useState("Teacher"),[modeOpen,setModeOpen]=useState(false),[text,setText]=useState(""),[files,setFiles]=useState([]),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[voiceBusy,setVoiceBusy]=useState(false),[query,setQuery]=useState(""),[conversationSearch,setConversationSearch]=useState(false),[conversationQuery,setConversationQuery]=useState(""),[account,setAccount]=useState(false),[page,setPage]=useState("chat"),[sidebar,setSidebar]=useState(()=>typeof window!=="undefined"&&window.innerWidth>800),[err,setErr]=useState(""),[dialog,setDialog]=useState(null),[nameDraft,setNameDraft]=useState(user.name);const fileRef=useRef(),textareaRef=useRef(),bottom=useRef(),mediaRecorderRef=useRef(),audioChunksRef=useRef(),audioStreamRef=useRef(),generationRef=useRef(null),pendingPromptRef=useRef(null),conversationSearchRef=useRef(null);
useEffect(()=>{
  const el=textareaRef.current;
  if(!el)return;
  el.style.height="auto";
  const maxHeight=180;
  el.style.height=`${Math.min(el.scrollHeight,maxHeight)}px`;
},[text]);
useEffect(()=>{
  const closePopovers=(event)=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    if(!target.closest(".mode-picker"))setModeOpen(false);
    if(!target.closest(".account-menu-area"))setAccount(false);
    if(conversationSearchRef.current&&!conversationSearchRef.current.contains(target)){
      setConversationSearch(false);
      setConversationQuery("");
    }

    // On small screens, close the sidebar whenever the user taps/clicks
    // anywhere outside the sidebar. Keep the menu toggle itself clickable.
    if(
      window.innerWidth <= 800 &&
      sidebar &&
      !target.closest(".sidebar") &&
      !target.closest(".sidebar-toggle")
    ){
      setSidebar(false);
    }
  };
  const onKey=(event)=>{if(event.key==="Escape"){setModeOpen(false);setAccount(false);setConversationSearch(false);setConversationQuery("")}};
  document.addEventListener("pointerdown",closePopovers);
  document.addEventListener("keydown",onKey);
  return()=>{document.removeEventListener("pointerdown",closePopovers);document.removeEventListener("keydown",onKey)};
},[sidebar]);
useEffect(()=>{let alive=true;(async()=>{try{const d=await api.chats();if(alive)setChats(Array.isArray(d?.chats)?d.chats.map((c,i)=>safeChat(c,i)):[])}catch(e){if(alive)setErr(e.message||"Could not load chat history.")}})();return()=>{alive=false}},[]);
useEffect(()=>{try{bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"})}catch{}} ,[messages]);
async function open(id){
  const chatId=safeId(id);
  if(!chatId||busy)return;
  setErr("");
  try{
    const d=await api.chat(chatId);
    const raw=d?.chat;
    if(!raw)throw Error("Could not open this chat.");
    const normalizedMessages=Array.isArray(raw.messages)?raw.messages.map((m,i)=>safeMessage(m,i)):[];
    setActive(chatId);
    setMode(safeMode(raw.mode));
    setMessages(normalizedMessages);
    if(window.innerWidth<800)setSidebar(false);
  }catch(e){setErr(e?.message||"Could not open this chat.")}
}
async function create(){try{const d=await api.createChat(mode);const chat=d?.chat;if(!chat?.id)throw Error("Could not create a new chat.");const normalized=safeChat(chat,0);setChats(x=>[normalized,...(Array.isArray(x)?x:[])]);setActive(normalized.id);setMode(normalized.mode);setMessages([]);setErr("");if(window.innerWidth<800)setSidebar(false)}catch(e){setErr(e?.message||"Could not create a new chat.")}}async function toggleRecording(){
  if(voiceBusy)return;
  if(recording){
    try{mediaRecorderRef.current?.stop();}catch{}
    return;
  }
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
    setErr("Audio recording is not supported by this browser. Please use a modern browser with microphone access.");
    return;
  }
  setErr("");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    audioStreamRef.current=stream;
    const preferred=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"].find(type=>MediaRecorder.isTypeSupported?.(type));
    const recorder=preferred?new MediaRecorder(stream,{mimeType:preferred}):new MediaRecorder(stream);
    audioChunksRef.current=[];
    mediaRecorderRef.current=recorder;
    recorder.ondataavailable=e=>{if(e.data?.size)audioChunksRef.current.push(e.data);};
    recorder.onstart=()=>setRecording(true);
    recorder.onerror=()=>{setRecording(false);setErr("The recording could not be completed. Please try again.");};
    recorder.onstop=async()=>{
      setRecording(false);
      mediaRecorderRef.current=null;
      audioStreamRef.current?.getTracks().forEach(track=>track.stop());
      audioStreamRef.current=null;
      const chunks=audioChunksRef.current||[];
      audioChunksRef.current=[];
      if(!chunks.length)return;
      const mime=recorder.mimeType||"audio/webm";
      const blob=new Blob(chunks,{type:mime});
      if(!blob.size)return;
      setVoiceBusy(true);
      setErr("");
      try{
        const response=await api.transcribeVoice(blob);
        const transcript=String(response?.text||"").trim();
        if(!transcript){setErr("No clear speech was detected. Please try again.");return;}
        setText(prev=>prev?`${prev} ${transcript}`:transcript);
      }catch(error){
        setErr(error?.message||"Voice transcription is temporarily unavailable. Please try again.");
      }finally{
        setVoiceBusy(false);
      }
    };
    recorder.start();
  }catch(error){
    audioStreamRef.current?.getTracks().forEach(track=>track.stop());
    audioStreamRef.current=null;
    setRecording(false);
    setErr(error?.name==="NotAllowedError"?"Microphone permission was denied. Allow microphone access and try again.":"Could not access the microphone. Please check your browser microphone settings.");
  }
}

useEffect(()=>()=>{try{mediaRecorderRef.current?.stop();}catch{} audioStreamRef.current?.getTracks().forEach(track=>track.stop());},[]);
async function send(){
  const outgoingText=String(text||"").trim();
  const outgoingFiles=Array.isArray(files)?[...files]:[];
  if((!outgoingText&&!outgoingFiles.length)||busy)return;
  const controller=new AbortController();
  generationRef.current=controller;
  pendingPromptRef.current={text:outgoingText,files:outgoingFiles};
  setBusy(true);setErr("");
  const attachments=outgoingFiles.map(f=>({name:f.name,mimeType:f.type||"application/octet-stream",size:f.size||0,previewUrl:f.type?.startsWith("image/")?URL.createObjectURL(f):""}));
  try{
    let id=active;
    if(!id){
      const created=await api.createChat(mode,controller.signal);
      if(!created?.chat?.id)throw Error("Could not create the chat. Please try again.");
      const normalized=safeChat(created.chat,0);
      id=normalized.id;
      setActive(id);
      setChats(x=>[normalized,...(Array.isArray(x)?x:[])]);
    }
    const userMessage={role:"user",mode,text:outgoingText,attachments,createdAt:new Date().toISOString()};
    setMessages(x=>[...(Array.isArray(x)?x:[]),userMessage]);
    setText("");
    setFiles([]);
    if(fileRef.current)fileRef.current.value="";
    const response=await api.send(id,outgoingText,outgoingFiles,controller.signal);
    if(controller.signal.aborted)return;
    const reply=response?.message;
    if(!reply||typeof reply.text!=="string")throw Error("CodeWise could not display the response. Please try again.");
    setMessages(x=>[...(Array.isArray(x)?x:[]),safeMessage({role:"model",mode:reply.mode||mode,text:reply.text,createdAt:reply.createdAt})]);
    try{
      const latest=await api.chats();
      if(Array.isArray(latest?.chats))setChats(latest.chats.map((c,i)=>safeChat(c,i)));
    }catch(historyError){if(historyError?.name!=="AbortError")console.warn("Chat history refresh failed",historyError);}
  }catch(e){
    if(e?.name==="AbortError"){
      setMessages(x=>{const copy=Array.isArray(x)?[...x]:[];if(copy.at(-1)?.role==="user")copy.pop();return copy;});
      if(pendingPromptRef.current){setText(pendingPromptRef.current.text||"");setFiles(pendingPromptRef.current.files||[]);}
      if(fileRef.current)fileRef.current.value="";
    }else{
      setErr(e?.message||"Something went wrong. Please try again.");
    }
  }finally{
    if(generationRef.current===controller)generationRef.current=null;
    pendingPromptRef.current=null;
    setBusy(false);
    setTimeout(()=>bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),0);
  }
}
function stopGeneration(){
  const controller=generationRef.current;
  if(controller&&!controller.signal.aborted)controller.abort();
}
async function del(id){const chatId=safeId(id);if(!chatId)return;try{await api.deleteChat(chatId);setChats(x=>x.filter(c=>c.id!==chatId));if(active===chatId){setActive(null);setMessages([])}}catch(e){setErr(e?.message||"Could not delete this chat.")}}async function saveName(){const name=nameDraft.trim();if(!name)return;setBusy(true);setErr("");try{await api.updateAccount({name});const u={...user,name};localStorage.setItem("codewise_user",JSON.stringify(u));setDialog(null);location.reload()}catch(e){setErr(e.message)}finally{setBusy(false)}}async function deleteAccount(){setBusy(true);setErr("");try{await api.deleteAccount();setDialog(null);logout()}catch(e){setErr(e.message);setDialog(null)}finally{setBusy(false)}}const conversationResults=conversationQuery.trim().length>0
  ? (Array.isArray(messages)?messages.map((m,i)=>({message:m,index:i})).filter(({message})=>String(message?.text||"").toLowerCase().includes(conversationQuery.trim().toLowerCase())):[])
  : [];
function jumpToConversationMessage(index){
  const el=document.querySelector(`[data-conversation-message="${index}"]`);
  el?.scrollIntoView({behavior:"smooth",block:"center"});
}
const latestModelIndex=Array.isArray(messages)
  ? messages.reduce((latest,m,i)=>m?.role==="model"?i:latest,-1)
  : -1;

async function changeEmailAccount(currentPassword,newEmail){
  return api.changeEmail({currentPassword,newEmail});
}
async function changePasswordAccount(currentPassword,newPassword){
  return api.changePassword({currentPassword,newPassword});
}
async function logoutAllDevices(){
  await api.logoutAllDevices();
  logout();
}
const navigatePage=next=>{setPage(next);if(typeof window!=="undefined"&&window.matchMedia("(max-width:800px)").matches)setSidebar(false)};
  const filtered=(Array.isArray(chats)?chats:[]).filter(c=>String(c?.title||"").concat(String(c?.preview||"")).toLowerCase().includes(query.toLowerCase()));
return <div className="app">
  <div className={`sidebar-backdrop ${sidebar?"open":""}`} onClick={()=>setSidebar(false)} aria-hidden="true"></div>

  <aside className={`sidebar ${sidebar?"open":""}`}>
    <div className="side-head">
      <div className="logo"><div className="logo-box"><Brain size={16}/></div><b>CodeWise</b></div>
      <button className="new" onClick={create}><Plus size={15}/> New chat</button>
      <div className="search"><Search size={14}/><input placeholder="Search history" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    </div>

    <div className="history">
      <label>CHAT HISTORY</label>
      {filtered.map(c=><button key={`${c.id}-${c.updatedAt||""}`} className={`chat-item ${active===c.id?"active":""}`} onClick={()=>{navigatePage("chat");open(c.id)}}>
        <MessageSquare size={13}/><span>{c.title||"New chat"}</span>
        <Trash2 className="trash" size={13} onClick={e=>{e.stopPropagation();del(c.id)}}/>
      </button>)}
      {!filtered.length&&<div className="none">No chats yet</div>}
    </div>

    <div className="side-bottom">
      <div className="account-menu-area">
        {account&&<div className="account-pop">
          <button onClick={()=>{setAccount(false);navigatePage("settings")}}><Settings size={14}/> Settings</button>
          <button onClick={()=>{setAccount(false);navigatePage("about")}}><Info size={14}/> About us</button>
        </div>}
        <button className="account" onClick={()=>setAccount(v=>!v)}>
          <span className="avatar">{safeName(user).charAt(0).toUpperCase()}</span>
          <span><b>{user.name}</b><small>{user.email}</small></span>
          <ChevronDown size={14}/>
        </button>
      </div>
      <button className="side-action" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>
        {theme==="dark"?<Sun size={14}/>:<Moon size={14}/>} {theme==="dark"?"Light":"Dark"} theme
      </button>
    </div>
  </aside>

  <main className={`main ${page!=="chat"?"page-main":""}`}>
    <header>
      <button className="sidebar-toggle" aria-label={sidebar ? "Close sidebar" : "Open sidebar"} aria-expanded={sidebar} onClick={()=>setSidebar(v=>!v)} type="button">
        <Menu size={18}/>
      </button>

      <div className="conversation-search" ref={conversationSearchRef}>
        <button className="conversation-search-trigger" type="button" aria-label="Search this conversation" title="Search this conversation" onClick={()=>{setConversationSearch(v=>!v);setConversationQuery("")}}>
          <Search size={15}/>
        </button>
        {conversationSearch&&<div className="conversation-search-panel">
          <div className="conversation-search-input">
            <Search size={14}/>
            <input autoFocus value={conversationQuery} onChange={e=>setConversationQuery(e.target.value)} placeholder="Search this conversation"/>
            {conversationQuery&&<button type="button" aria-label="Clear search" onClick={()=>setConversationQuery("")}><X size={13}/></button>}
          </div>
          {conversationQuery.trim()&&<div className="conversation-search-results">
            {conversationResults.length
              ? conversationResults.map(({message,index})=><button type="button" className="conversation-search-result" key={index} onClick={()=>jumpToConversationMessage(index)}>
                  <span className="conversation-search-result-role">{message?.role==="model"?"CodeWise":"You"}</span>
                  <span>{String(message?.text||"").replace(/\s+/g," ").slice(0,140)}{String(message?.text||"").length>140?"…":""}</span>
                </button>)
              : <div className="conversation-search-empty">No messages found</div>}
          </div>}
        </div>}
      </div>

      <div className="mode-picker">
        <button className="mode-trigger" aria-haspopup="listbox" aria-expanded={modeOpen} onClick={()=>setModeOpen(v=>!v)}>
          <Brain size={15}/><span>{mode}</span><ChevronDown size={15}/>
        </button>
        {modeOpen&&<div className="mode-menu" role="listbox">
          {MODES.map(m=><button key={m.name} role="option" aria-selected={mode===m.name} className={`mode-option ${mode===m.name?"selected":""}`} onClick={()=>{setMode(m.name);setModeOpen(false)}}>
            <m.icon size={15}/><span><b>{m.name}</b><small>{m.desc}</small></span>{mode===m.name&&<Check size={14}/>}
          </button>)}
        </div>}
      </div>
      <span className="private">● Private workspace</span>
    </header>

    {page==="settings" ? (
      <div className="content-page">
        <SettingsPage user={user} theme={theme} setTheme={setTheme} onBack={()=>navigatePage("chat")} onLogout={logout} onDelete={()=>setDialog({type:"delete"})} busy={busy} error={err}/>
      </div>
    ) : page==="about" ? (
      <div className="content-page">
        <AboutPage onBack={()=>navigatePage("chat")}/>
      </div>
    ) : (
      <>
        <section className="messages">
          {messages.length ? (
            <div className="message-wrap">
              {messages.filter(Boolean).map((m,i)=>
                <MessageBoundary key={`${active||"none"}-${i}-${m?.id||""}`}>
                  <MessageView
                    message={m}
                    user={user}
                    index={i}
                    onTryNext={m?.role==="model"&&i===latestModelIndex&&!busy?prompt=>{setText(prompt);setTimeout(()=>textareaRef.current?.focus(),0)}:undefined}
                  />
                </MessageBoundary>
              )}
              {busy&&<AnalysisLoader/>}
              <div ref={bottom}/>
            </div>
          ) : <Welcome mode={mode} setMode={setMode} focus={()=>{}}/>}
        </section>

        <div className="mobile-mode-bar" aria-label="CodeWise modes">
          {MODES.map(m=><button key={m.name} type="button" className={`mobile-mode-chip ${mode===m.name?"active":""}`} onClick={()=>{setMode(m.name);setModeOpen(false)}}>{m.name}</button>)}
        </div>

        <div className="composer-area">
          {err&&<div className="error">{err}</div>}
          {files.length>0&&<div className="files">{files.map((f,i)=><span key={i}><Paperclip size={11}/>{f.name}<button onClick={()=>setFiles(files.filter((_,j)=>j!==i))}><X size={11}/></button></span>)}</div>}
          <div className="composer">
            <button onClick={()=>fileRef.current?.click()} title="Attach files"><Paperclip size={18}/></button>
            <input ref={fileRef} hidden type="file" multiple accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx" onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,5))}/>
            <textarea ref={textareaRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask CodeWise" rows="1"/>
            <button onClick={()=>fileRef.current?.click()} title="Attach image"><ImageIcon size={18}/></button>
            <button className={`mic ${recording?"recording":""}`} disabled={voiceBusy||busy} title={recording?"Stop recording":voiceBusy?"Transcribing…":"Record voice"} aria-label={recording?"Stop recording":voiceBusy?"Transcribing…":"Record voice"} onClick={toggleRecording}><Mic size={16}/></button>
            <button className={`send ${busy?"stop-generating":""}`} disabled={!busy&&(!text.trim()&&!files.length)} onClick={busy?stopGeneration:send} title={busy?"Stop generating":"Send"} aria-label={busy?"Stop generating":"Send"}>
              {busy?<Square size={14} fill="currentColor"/>:<Send size={16}/>}
            </button>
          </div>
          <div className="composer-note"><span>{voiceBusy?"Transcribing voice…":recording?"Recording… Click the microphone to stop":`${mode} mode`}</span></div>
        </div>
      </>
    )}

  </main>

  <Dialog dialog={dialog} onClose={()=>!busy&&setDialog(null)} onConfirm={dialog?.type==="name"?saveName:deleteAccount} nameDraft={nameDraft} setNameDraft={setNameDraft} busy={busy}/>
</div>
}
function AnalysisLoader(){
  return <div className="analysis-loader" aria-live="polite" aria-label="Analysing">
    <div className="analysis-label">Analysing</div>
    <div className="analysis-skeleton" aria-hidden="true">
      <span className="skeleton-line long"></span>
      <span className="skeleton-line medium"></span>
      <span className="skeleton-line long-short"></span>
      <span className="skeleton-line short"></span>
    </div>
  </div>;
}

function Welcome({mode,setMode}){return <div className="welcome"><div className="welcome-logo"><Brain size={27}/></div><h1>How can I help you learn DSA?</h1><p>Choose a mode and ask anything. I'll guide your thinking instead of simply giving you the answer.</p><div className="modes">{MODES.map(m=>{const I=m.icon;return <button className={mode===m.name?"selected":""} onClick={()=>setMode(m.name)} key={m.name}><I size={17}/><b>{m.name}</b><small>{m.desc}</small></button>})}</div></div>}
createRoot(document.getElementById("root")).render(<App/>);
