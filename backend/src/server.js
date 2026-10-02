import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

if (!process.env.JWT_SECRET || !process.env.DATA_ENCRYPTION_KEY) {
  throw new Error("JWT_SECRET and DATA_ENCRYPTION_KEY are required");
}

// Trust Render's reverse proxy
app.set("trust proxy", 1);

await connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on port ${PORT}`);
});