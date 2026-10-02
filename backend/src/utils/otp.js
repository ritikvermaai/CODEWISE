import crypto from "node:crypto";
export function generateOtp(){return String(crypto.randomInt(100000,1000000));}
export function hashOtp(otp,salt){return crypto.createHash("sha256").update(`${salt}:${otp}`).digest("hex");}
export function makeOtpRecord(otp){const salt=crypto.randomBytes(16).toString("hex");return {hash:hashOtp(otp,salt),salt};}
export function sameOtp(otp,hash,salt){return Boolean(hash&&salt)&&crypto.timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(hashOtp(otp,salt),"hex"));}
