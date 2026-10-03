import bcrypt from "bcryptjs";import User from "../models/User.js";import Chat from "../models/Chat.js";
const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const safe=u=>({id:u.publicId,name:u.name,email:u.email,createdAt:u.createdAt,role:u.role==="owner"?"owner":"user",requestUsage:{count:u.requestCount||0,limit:50,windowStartedAt:u.requestWindowStartedAt||null}});

export async function account(req,res){res.json({account:safe(req.user)})}

export async function update(req,res){
  const u=await User.findById(req.user._id);if(!u)return res.status(404).json({message:"Account not found"});
  // role is intentionally never accepted from client input; only direct database changes may assign "owner".
  if(req.body.name!==undefined){const name=String(req.body.name).trim();if(!name)return res.status(400).json({message:"Name cannot be empty"});u.name=name.slice(0,80)}
  await u.save();res.json({account:safe(u)})
}

export async function changeEmail(req,res){
  const {currentPassword,newEmail}=req.body;
  const u=await User.findById(req.user._id);if(!u)return res.status(404).json({message:"Account not found"});
  if(!(await bcrypt.compare(currentPassword||"",u.passwordHash)))return res.status(401).json({message:"Current password is incorrect"});
  const email=String(newEmail||"").toLowerCase().trim();
  if(!validEmail(email))return res.status(400).json({message:"Enter a valid email address"});
  if(email===u.email)return res.status(400).json({message:"That is already your email"});
  if(await User.findOne({email,_id:{$ne:u._id}}))return res.status(409).json({message:"That email is already in use"});
  u.email=email;u.emailVerified=true;u.sessionVersion=(u.sessionVersion||0)+1;
  await u.save();res.json({account:safe(u)})
}

export async function changePassword(req,res){
  const {currentPassword,newPassword}=req.body;
  const u=await User.findById(req.user._id);if(!u)return res.status(404).json({message:"Account not found"});
  if(!(await bcrypt.compare(currentPassword||"",u.passwordHash)))return res.status(401).json({message:"Current password is incorrect"});
  if(String(newPassword||"").length<8)return res.status(400).json({message:"New password must be at least 8 characters"});
  u.passwordHash=await bcrypt.hash(newPassword,12);u.sessionVersion=(u.sessionVersion||0)+1;
  await u.save();res.json({ok:true})
}

export async function logoutAll(req,res){
  const u=await User.findById(req.user._id);if(!u)return res.status(404).json({message:"Account not found"});
  u.sessionVersion=(u.sessionVersion||0)+1;await u.save();res.json({ok:true})
}

export async function remove(req,res){
  await Chat.deleteMany({userId:req.user._id});await User.deleteOne({_id:req.user._id});res.json({ok:true})
}
