import mongoose from "mongoose";
const schema=new mongoose.Schema({publicId:{type:String,unique:true,index:true},userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},originalName:String,mimeType:String,size:Number,encryptedPath:String,geminiFileName:String,geminiUri:String,createdAt:{type:Date,default:Date.now}});
export default mongoose.model("File",schema);
