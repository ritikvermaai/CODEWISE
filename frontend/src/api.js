const API=import.meta.env.VITE_API_URL||"http://localhost:5000/api";
async function request(path,o={}){
  const h=new Headers(o.headers||{}),t=localStorage.getItem("codewise_token")||localStorage.getItem("dsa_token");
  if(!(o.body instanceof FormData))h.set("Content-Type","application/json");
  if(t)h.set("Authorization",`Bearer ${t}`);
  let r;
  try{r=await fetch(API+path,{...o,headers:h});}
  catch(e){throw Error("CodeWise could not reach the server. Make sure the backend is running.");}
  const contentType=r.headers.get("content-type")||"";
  const d=contentType.includes("application/json")?await r.json().catch(()=>({})):{};
  if(r.status===401){localStorage.removeItem("codewise_token");localStorage.removeItem("dsa_token");localStorage.removeItem("codewise_user");window.dispatchEvent(new Event("codewise:auth-expired"));throw Error(d.message||"Authentication required");}
  if(!r.ok)throw Error(d.message||`Request failed (${r.status})`);
  return d;
}
export const api={register:b=>request("/auth/register",{method:"POST",body:JSON.stringify(b)}),login:b=>request("/auth/login",{method:"POST",body:JSON.stringify(b)}),verifyEmail:b=>request("/auth/verify-email",{method:"POST",body:JSON.stringify(b)}),resendOtp:b=>request("/auth/resend-otp",{method:"POST",body:JSON.stringify(b)}),forgotPassword:b=>request("/auth/forgot-password",{method:"POST",body:JSON.stringify(b)}),resetPassword:b=>request("/auth/reset-password",{method:"POST",body:JSON.stringify(b)}),chats:()=>request("/chats"),createChat:mode=>request("/chats",{method:"POST",body:JSON.stringify({mode})}),chat:id=>request(`/chats/${id}`),send:(id,text,files)=>{const f=new FormData();f.append("text",text);files.forEach(x=>f.append("files",x));return request(`/chats/${id}/messages`,{method:"POST",body:f})},deleteChat:id=>request(`/chats/${id}`,{method:"DELETE"}),transcribeVoice:audio=>{const f=new FormData();f.append("audio",audio,"codewise-voice.webm");return request("/voice/transcribe",{method:"POST",body:f})},account:()=>request("/account"),updateAccount:b=>request("/account",{method:"PATCH",body:JSON.stringify(b)}),deleteAccount:()=>request("/account",{method:"DELETE"})};
