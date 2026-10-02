import { transcribeAudio } from "../services/gemini.js";

export async function transcribeVoice(req, res) {
  if (!req.file) return res.status(400).json({ message: "No audio recording was received." });
  try {
    const text = await transcribeAudio({ buffer: req.file.buffer, mimeType: req.file.mimetype });
    return res.json({ text });
  } catch (error) {
    console.error("CodeWise voice transcription error:", error);
    return res.status(502).json({ message: "Voice transcription is temporarily unavailable. Please try again." });
  }
}
