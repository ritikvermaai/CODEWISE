import User from "../models/User.js";import Chat from "../models/Chat.js";
export async function account(req,res){res.json({account:{id:req.user.publicId,name:req.user.name,email:req.user.email,createdAt:req.user.createdAt}})}
export async function update(req,res){const u=await User.findById(req.user._id);if(req.body.name)u.name=String(req.body.name).trim().slice(0,80);await u.save();res.json({account:{id:u.publicId,name:u.name,email:u.email,createdAt:u.createdAt}})}
export async function remove(req,res){await Chat.deleteMany({userId:req.user._id});await User.deleteOne({_id:req.user._id});res.json({ok:true})}
