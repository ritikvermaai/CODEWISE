export async function sendOtpEmail({to,name,otp,type="verify"}){
  const serviceId=process.env.EMAILJS_SERVICE_ID,templateId=type==="reset"?process.env.EMAILJS_RESET_TEMPLATE_ID:process.env.EMAILJS_OTP_TEMPLATE_ID,publicKey=process.env.EMAILJS_PUBLIC_KEY,privateKey=process.env.EMAILJS_PRIVATE_KEY;
  if(!serviceId||!templateId||!publicKey) throw new Error("EmailJS is not configured. Add the EmailJS service, template and public key to backend/.env.");
  const body={service_id:serviceId,template_id:templateId,user_id:publicKey,template_params:{to_email:to,email:to,user_name:name,otp,code:otp,expires_in:"5 minutes"}};
  if(privateKey) body.accessToken=privateKey;
  const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) throw new Error(`EmailJS failed: ${await r.text()}`);
}
