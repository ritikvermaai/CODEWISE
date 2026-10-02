import React,{useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{Brain,Plus,Search,Paperclip,Image as ImageIcon,Send,Moon,Sun,LogOut,Settings,ChevronDown,X,Trash2,Menu,MessageSquare,GraduationCap,Lightbulb,Bug,Mic,AlertTriangle,Check}from"lucide-react";import{api}from"./api";import"./styles.css";

const escapeHtml=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
function renderInline(value){
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
function MessageView({message,user}){
  const m=safeMessage(message); const name=safeName(user); const initial=name.charAt(0).toUpperCase();
  return <div className={`message ${m.role}`}>
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
function Auth({onDone}){const[screen,setScreen]=useState("login"),[f,setF]=useState({name:"",email:"",password:"",otp:"",newPassword:""}),[err,setErr]=useState(""),[info,setInfo]=useState(""),[busy,setBusy]=useState(false),[theme,setTheme]=useState(localStorage.getItem("theme")||"dark");useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("theme",theme)},[theme]);const update=(k,v)=>setF(x=>({...x,[k]:v}));async function run(fn){setBusy(true);setErr("");setInfo("");try{return await fn()}catch(e){setErr(e.message)}finally{setBusy(false)}}async function submit(e){e.preventDefault();if(screen==="register")return run(async()=>{const d=await api.register({name:f.name,email:f.email,password:f.password});setScreen("verify");setInfo(d.message||"Check your email for the OTP.")});if(screen==="login")return run(async()=>{const d=await api.login({email:f.email,password:f.password});localStorage.setItem("codewise_token",d.token);localStorage.setItem("codewise_user",JSON.stringify(d.user));onDone(d.user)});if(screen==="verify")return run(async()=>{const d=await api.verifyEmail({email:f.email,otp:f.otp});localStorage.setItem("codewise_token",d.token);localStorage.setItem("codewise_user",JSON.stringify(d.user));onDone(d.user)});if(screen==="forgot")return run(async()=>{const d=await api.forgotPassword({email:f.email});setScreen("reset");setInfo(d.message||"Check your email for the reset OTP.")});if(screen==="reset")return run(async()=>{await api.resetPassword({email:f.email,otp:f.otp,password:f.newPassword});setScreen("login");setInfo("Password reset successfully. You can sign in now.")})}const title=screen==="register"?"Create account":screen==="verify"?"Verify your email":screen==="forgot"?"Forgot password":screen==="reset"?"Reset password":"Welcome back";return <div className="auth"><div className="auth-orbit auth-orbit-one"></div><div className="auth-orbit auth-orbit-two"></div><div className="auth-grid"></div><div className="auth-card"><button type="button" className="auth-theme-toggle" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={`Switch to ${theme==="dark"?"light":"dark"} theme`} title={`Switch to ${theme==="dark"?"light":"dark"} theme`}>{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}<span>{theme==="dark"?"Light":"Dark"}</span></button><div className="auth-brand"><div className="auth-brand-mark"><Brain size={28}/></div><div><b>CodeWise</b><span>Learn. Think. Solve.</span></div></div><h1>{title}</h1><p>{screen==="verify"?<>We sent a 6-digit code to <b>{f.email}</b>.</>:screen==="reset"?<>Enter the 6-digit code sent to <b>{f.email}</b> and choose a new password.</>:"A private AI teacher that helps you learn how to think through DSA."}</p><form onSubmit={submit}>{screen==="register"&&<input placeholder="Name" required value={f.name} onChange={e=>update("name",e.target.value)}/>} {(screen!=="verify"&&screen!=="reset")&&<input type="email" placeholder="Email" required value={f.email} onChange={e=>update("email",e.target.value)}/>} {(screen==="login"||screen==="register")&&<input type="password" placeholder="Password" minLength="8" required value={f.password} onChange={e=>update("password",e.target.value)}/>} {(screen==="verify"||screen==="reset")&&<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="6-digit OTP" required value={f.otp} onChange={e=>update("otp",e.target.value.replace(/\D/g,"").slice(0,6))}/>} {screen==="reset"&&<input type="password" placeholder="New password (8+ characters)" minLength="8" required value={f.newPassword} onChange={e=>update("newPassword",e.target.value)}/>} {err&&<div className="error">{err}</div>}{info&&<div className="info">{info}</div>}<button className="primary">{busy?"Please wait…":screen==="register"?"Create account":screen==="verify"?"Verify email":screen==="forgot"?"Send OTP":screen==="reset"?"Reset password":"Sign in"}</button></form>{screen==="verify"&&<button className="link" disabled={busy} onClick={()=>run(async()=>{const d=await api.resendOtp({email:f.email});setInfo(d.message)})}>Resend OTP</button>}{screen==="login"&&<><button className="link" onClick={()=>{setErr("");setInfo("");setScreen("forgot")}}>Forgot password?</button><button className="link" onClick={()=>{setErr("");setInfo("");setScreen("register")}}>Create a new account</button></>}{screen==="register"&&<button className="link" onClick={()=>setScreen("login")}>Already have an account? Sign in</button>}{(screen==="verify"||screen==="forgot"||screen==="reset")&&<button className="link" onClick={()=>{setErr("");setInfo("");setScreen("login")}}>Back to sign in</button>}</div></div>}
function App(){const[user,setUser]=useState(()=>JSON.parse(localStorage.getItem("codewise_user")||"null")),[theme,setTheme]=useState(localStorage.getItem("theme")||"dark");useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("theme",theme)},[theme]);useEffect(()=>{const onExpired=()=>setUser(null);window.addEventListener("codewise:auth-expired",onExpired);return()=>window.removeEventListener("codewise:auth-expired",onExpired)},[]);if(!user)return <Auth onDone={setUser}/>;const logout=()=>{localStorage.removeItem("codewise_token");localStorage.removeItem("dsa_token");localStorage.removeItem("codewise_user");setUser(null)};return <Workspace user={user} theme={theme} setTheme={setTheme} logout={logout}/>}
function Workspace({user,theme,setTheme,logout}){const[chats,setChats]=useState([]),[active,setActive]=useState(null),[messages,setMessages]=useState([]),[mode,setMode]=useState("Teacher"),[modeOpen,setModeOpen]=useState(false),[text,setText]=useState(""),[files,setFiles]=useState([]),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[voiceBusy,setVoiceBusy]=useState(false),[query,setQuery]=useState(""),[account,setAccount]=useState(false),[sidebar,setSidebar]=useState(true),[err,setErr]=useState(""),[dialog,setDialog]=useState(null),[nameDraft,setNameDraft]=useState(user.name);const fileRef=useRef(),bottom=useRef(),mediaRecorderRef=useRef(),audioChunksRef=useRef(),audioStreamRef=useRef();
useEffect(()=>{
  const closePopovers=(event)=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    if(!target.closest(".mode-picker"))setModeOpen(false);
    if(!target.closest(".account-menu-area"))setAccount(false);
  };
  const onKey=(event)=>{if(event.key==="Escape"){setModeOpen(false);setAccount(false)}};
  document.addEventListener("pointerdown",closePopovers);
  document.addEventListener("keydown",onKey);
  return()=>{document.removeEventListener("pointerdown",closePopovers);document.removeEventListener("keydown",onKey)};
},[]);
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
  setBusy(true);setErr("");
  const attachments=outgoingFiles.map(f=>({
    name:f.name,
    mimeType:f.type||"application/octet-stream",
    size:f.size||0,
    previewUrl:f.type?.startsWith("image/")?URL.createObjectURL(f):""
  }));
  try{
    let id=active;
    if(!id){
      const created=await api.createChat(mode);
      if(!created?.chat?.id)throw Error("Could not create the chat. Please try again.");
      const normalized=safeChat(created.chat,0);
      id=normalized.id;
      setActive(id);
      setChats(x=>[normalized,...(Array.isArray(x)?x:[])]);
    }
    const userMessage={role:"user",mode,text:outgoingText,attachments,createdAt:new Date().toISOString()};
    setMessages(x=>[...(Array.isArray(x)?x:[]),userMessage]);
    // Clear the composer immediately after the message is queued so text and attachments never remain in the input.
    setText("");
    setFiles([]);
    if(fileRef.current)fileRef.current.value="";
    const response=await api.send(id,outgoingText,outgoingFiles);
    const reply=response?.message;
    if(!reply||typeof reply.text!=="string")throw Error("CodeWise could not display the response. Please try again.");
    setMessages(x=>[...(Array.isArray(x)?x:[]),safeMessage({role:"model",mode:reply.mode||mode,text:reply.text,createdAt:reply.createdAt})]);
    try{
      const latest=await api.chats();
      if(Array.isArray(latest?.chats))setChats(latest.chats.map((c,i)=>safeChat(c,i)));
    }catch(historyError){console.warn("Chat history refresh failed",historyError);}
  }catch(e){
    setErr(e?.message||"Something went wrong. Please try again.");
  }finally{
    setBusy(false);
    setTimeout(()=>bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),0);
  }
}
async function del(id){const chatId=safeId(id);if(!chatId)return;try{await api.deleteChat(chatId);setChats(x=>x.filter(c=>c.id!==chatId));if(active===chatId){setActive(null);setMessages([])}}catch(e){setErr(e?.message||"Could not delete this chat.")}}async function saveName(){const name=nameDraft.trim();if(!name)return;setBusy(true);setErr("");try{await api.updateAccount({name});const u={...user,name};localStorage.setItem("codewise_user",JSON.stringify(u));setDialog(null);location.reload()}catch(e){setErr(e.message)}finally{setBusy(false)}}async function deleteAccount(){setBusy(true);setErr("");try{await api.deleteAccount();setDialog(null);logout()}catch(e){setErr(e.message);setDialog(null)}finally{setBusy(false)}}const filtered=(Array.isArray(chats)?chats:[]).filter(c=>String(c?.title||"").concat(String(c?.preview||"")).toLowerCase().includes(query.toLowerCase()));return <div className="app"><aside className={`sidebar ${sidebar?"open":""}`}><div className="side-head"><div className="logo"><div className="logo-box"><Brain size={16}/></div><b>CodeWise</b></div><button className="new" onClick={create}><Plus size={15}/> New chat</button><div className="search"><Search size={14}/><input placeholder="Search history" value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="history"><label>CHAT HISTORY</label>{filtered.map(c=><button key={`${c.id}-${c.updatedAt||""}`} className={`chat-item ${active===c.id?"active":""}`} onClick={()=>open(c.id)}><MessageSquare size={13}/><span>{c.title||"New chat"}</span><Trash2 className="trash" size={13} onClick={e=>{e.stopPropagation();del(c.id)}}/></button>)}{!filtered.length&&<div className="none">No chats yet</div>}</div><div className="side-bottom"><div className="account-menu-area">{account&&<div className="account-pop"><small>User ID</small><code>{user.id}</code><button onClick={()=>{setNameDraft(user.name);setDialog({type:"name"})}}><Settings size={13}/> Manage account</button><button className="danger" onClick={()=>setDialog({type:"delete"})}><Trash2 size={13}/> Delete account</button></div>}<button className="account" onClick={()=>setAccount(v=>!v)}><span className="avatar">{safeName(user).charAt(0).toUpperCase()}</span><span><b>{user.name}</b><small>{user.email}</small></span><ChevronDown size={14}/></button></div><button className="side-action" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={14}/>:<Moon size={14}/>} {theme==="dark"?"Light":"Dark"} theme</button><button className="side-action" onClick={logout}><LogOut size={14}/> Sign out</button></div></aside><main className="main"><header><button className="mobile" onClick={()=>setSidebar(!sidebar)}><Menu size={18}/></button>
<div className="mode-picker">
  <button className="mode-trigger" aria-haspopup="listbox" aria-expanded={modeOpen} onClick={()=>setModeOpen(v=>!v)}><Brain size={15}/><span>{mode}</span><ChevronDown size={15}/></button>
  {modeOpen&&<div className="mode-menu" role="listbox">
    {MODES.map(m=><button key={m.name} role="option" aria-selected={mode===m.name} className={`mode-option ${mode===m.name?"selected":""}`} onClick={()=>{setMode(m.name);setModeOpen(false)}}><m.icon size={15}/><span><b>{m.name}</b><small>{m.desc}</small></span>{mode===m.name&&<Check size={14}/>}</button>)}
  </div>}
</div>
<span className="private">● Private workspace</span></header><section className="messages">{messages.length?<div className="message-wrap">{messages.filter(Boolean).map((m,i)=><MessageBoundary key={`${active||"none"}-${i}-${m?.id||""}`}><MessageView message={m} user={user}/></MessageBoundary>)}{busy&&<AnalysisLoader/>}<div ref={bottom}/></div>:<Welcome mode={mode} setMode={setMode} focus={()=>{}}/>}</section><div className="composer-area">{err&&<div className="error">{err}</div>}{files.length>0&&<div className="files">{files.map((f,i)=><span key={i}><Paperclip size={11}/>{f.name}<button onClick={()=>setFiles(files.filter((_,j)=>j!==i))}><X size={11}/></button></span>)}</div>}<div className="composer"><button onClick={()=>fileRef.current?.click()} title="Attach files"><Paperclip size={18}/></button><input ref={fileRef} hidden type="file" multiple accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx" onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,5))}/><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder={`Ask your CodeWise assistant in ${mode} mode…`} rows="1"/><button onClick={()=>fileRef.current?.click()} title="Attach image"><ImageIcon size={18}/></button><button className={`mic ${recording?"recording":""}`} disabled={voiceBusy||busy} title={recording?"Stop recording":voiceBusy?"Transcribing…":"Record voice"} aria-label={recording?"Stop recording":voiceBusy?"Transcribing…":"Record voice"} onClick={toggleRecording}><Mic size={16}/></button><button className="send" disabled={busy||(!text.trim()&&!files.length)} onClick={send} title="Send"><Send size={16}/></button></div><div className="composer-note"><span>{voiceBusy?"Transcribing voice…":recording?"Recording… Click the microphone to stop":`${mode} mode`}</span></div></div></main><Dialog dialog={dialog} onClose={()=>!busy&&setDialog(null)} onConfirm={dialog?.type==="name"?saveName:deleteAccount} nameDraft={nameDraft} setNameDraft={setNameDraft} busy={busy}/></div>}
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
