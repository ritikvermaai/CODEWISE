import multer from "multer";
const allowed=new Set(["image/png","image/jpeg","image/webp","image/gif","application/pdf","text/plain","text/markdown","text/csv","application/json","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
export const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:5},fileFilter:(r,f,cb)=>cb(null,allowed.has(f.mimetype))});
const audioTypes=new Set(["audio/webm","audio/ogg","audio/wav","audio/mpeg","audio/mp4","audio/aac","audio/flac","audio/x-m4a","audio/mp4;codecs=mp4a.40.2"]);
export const audioUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024,files:1},fileFilter:(r,f,cb)=>{
  const type=String(f.mimetype||"").toLowerCase().split(";")[0];
  cb(null,type.startsWith("audio/")&&audioTypes.has(type));
}});
