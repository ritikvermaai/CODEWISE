import crypto from "node:crypto";
export const publicId=p=>`${p}_${crypto.randomBytes(12).toString("hex")}`;
