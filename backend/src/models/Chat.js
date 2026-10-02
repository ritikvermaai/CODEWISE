import mongoose from "mongoose";
const message=new mongoose.Schema({role:{type:String,enum:["user","model"],required:true},mode:String,encryptedText:{type:String,required:true},attachments:[{fileId:String,name:String,mimeType:String}],createdAt:{type:Date,default:Date.now}},{_id:true});
const schema=new mongoose.Schema({publicId:{type:String,unique:true,index:true},userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},encryptedTitle:{type:String,required:true},mode:{type:String,enum:["Teacher","Explain","Hint","Interview","Debug"],default:"Teacher"},messages:[message],createdAt:{type:Date,default:Date.now},updatedAt:{type:Date,default:Date.now}});
schema.index({userId:1,updatedAt:-1}); export default mongoose.model("Chat",schema);
