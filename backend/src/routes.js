import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/auth.js";
import { upload, audioUpload } from "./middleware/upload.js";
import { register, login, me, verifyEmail, resendOtp, forgotPassword, resetPassword } from "./controllers/auth.js";
import { list, create, get, send, remove } from "./controllers/chats.js";
import { account, update, remove as deleteAccount } from "./controllers/account.js";
import { transcribeVoice } from "./controllers/voice.js";

const r = Router();
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
const otpLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

r.get("/health", (req, res) => res.json({ ok: true, app: "CodeWise" }));
r.post("/auth/register", authLimit, asyncRoute(register));
r.post("/auth/login", authLimit, asyncRoute(login));
r.post("/auth/verify-email", otpLimit, asyncRoute(verifyEmail));
r.post("/auth/resend-otp", otpLimit, asyncRoute(resendOtp));
r.post("/auth/forgot-password", otpLimit, asyncRoute(forgotPassword));
r.post("/auth/reset-password", otpLimit, asyncRoute(resetPassword));
r.get("/auth/me", requireAuth, asyncRoute(me));
r.get("/chats", requireAuth, asyncRoute(list));
r.post("/chats", requireAuth, asyncRoute(create));
r.get("/chats/:id", requireAuth, asyncRoute(get));
r.post("/chats/:id/messages", requireAuth, upload.array("files", 5), asyncRoute(send));
r.delete("/chats/:id", requireAuth, asyncRoute(remove));
r.post("/voice/transcribe", requireAuth, audioUpload.single("audio"), asyncRoute(transcribeVoice));
r.get("/account", requireAuth, asyncRoute(account));
r.patch("/account", requireAuth, asyncRoute(update));
r.delete("/account", requireAuth, asyncRoute(deleteAccount));

export default r;
