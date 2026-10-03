import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPredefinedReply } from "./predefined.js";

const policies = {
  Teacher: "You are a patient DSA teacher. Explain first, then ask one focused question. Do not dump the solution.",
  Explain: "Explain DSA clearly from intuition to example to pattern and complexity, then check understanding.",
  Hint: "Give the smallest useful hint. Never reveal the complete solution unless explicitly requested after attempts.",
  Interview: "Act as a DSA interviewer. Ask concise questions and evaluate reasoning. Do not teach unless asked for a hint.",
  Debug: "Act as a debugging teacher. Find the first wrong assumption and guide the student to fix it."
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function statusOf(error) {
  return Number(error?.status ?? error?.error?.code ?? error?.response?.status ?? 0);
}

function isTransient(error) {
  return [408, 429, 500, 502, 503, 504].includes(statusOf(error));
}

async function generateWithRetry(ai, model, contents, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await ai.models.generateContent({ model, contents });
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === attempts - 1) throw error;
      await sleep((2 ** attempt) * 800 + Math.floor(Math.random() * 400));
    }
  }
  throw lastError;
}

export async function transcribeAudio({ buffer, mimeType }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini transcription is not configured.");
  }
  if (!buffer?.length) {
    throw new Error("No audio was received.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite"
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const safeMime = String(mimeType || "audio/webm").split(";")[0].toLowerCase();
  const tempPath = path.join(os.tmpdir(), `codewise-voice-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  let uploaded = null;

  try {
    await fs.writeFile(tempPath, buffer);
    uploaded = await ai.files.upload({ file: tempPath, config: { mimeType: safeMime } });
    const contents = createUserContent([
      "Transcribe the attached audio exactly into plain text. Return only the spoken words. Do not add labels, explanations, Markdown, bullets, or quotation marks. If there is no understandable speech, return an empty response.",
      createPartFromUri(uploaded.uri, uploaded.mimeType || safeMime)
    ]);

    let response = null;
    let lastError = null;
    for (const model of models) {
      try {
        response = await generateWithRetry(ai, model, contents);
        break;
      } catch (error) {
        lastError = error;
        if (!isTransient(error)) throw error;
      }
    }
    if (!response) throw lastError || new Error("Transcription service is temporarily unavailable.");
    return String(response.text || "").trim();
  } finally {
    if (uploaded?.name) {
      await ai.files.delete({ name: uploaded.name }).catch(() => {});
    }
    await fs.unlink(tempPath).catch(() => {});
  }
}

export async function generateReply({ mode, history, text, files = [] }) {
  // Casual/off-topic text never touches Gemini. This keeps simple messages fast and free.
  if (!files.length) {
    const predefined = getPredefinedReply(text);
    if (predefined) return { text: predefined, source: "predefined" };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      text: "Gemini is not configured. Add GEMINI_API_KEY to backend/.env to enable coding help.",
      source: "fallback"
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite"
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const uploaded = [];
  const temp = [];

  try {
    for (const file of files) {
      const tempPath = path.join(
        os.tmpdir(),
        `codewise-${Date.now()}-${Math.random().toString(16).slice(2)}`
      );
      await fs.writeFile(tempPath, file.buffer);
      temp.push(tempPath);
      uploaded.push(
        await ai.files.upload({
          file: tempPath,
          config: { mimeType: file.mimeType }
        })
      );
    }

    const prompt = `${policies[mode] || policies.Teacher}

Recent conversation:
${history.slice(-12).map(item => `${item.role}: ${item.text}`).join("\n")}

Student: ${text || "The student uploaded a file/image without text."}

Write the answer in clear, simple, professional language that is easy to scan on both desktop and mobile.

Formatting rules:
- Use Markdown headings such as ## Concept, ## Example, ## Complexity when a section needs a heading.
- Use short bullet lists for important points, steps, rules, or takeaways.
- Use **bold** for important terms, key ideas, warnings, and conclusions.
- Prefer short paragraphs instead of large walls of text.
- For an important takeaway, you may write **Important:** followed by the point.
- Use numbered lists when steps must be followed in order.
- Use fenced code blocks only when code is necessary.
- Do not use decorative separators or excessive emojis.
- Keep explanations direct and beginner-friendly, while preserving technical accuracy.
- Adapt the depth and wording to the student's reasoning.`;

    const parts = [prompt, ...uploaded.map(file => createPartFromUri(file.uri, file.mimeType))];
    let response = null;
    let lastError = null;

    for (const model of models) {
      try {
        response = await generateWithRetry(ai, model, createUserContent(parts));
        break;
      } catch (error) {
        lastError = error;
        if (!isTransient(error)) throw error;
      }
    }

    if (!response) {
      console.error("Gemini temporarily unavailable:", lastError);
      return {
        text: "Gemini is temporarily busy. Your message is safe and the server is still running. Please try again in a moment.",
        source: "fallback"
      };
    }

    return {
      text: response.text || "I couldn't generate a response. Please try again.",
      source: "gemini"
    };
  } catch (error) {
    console.error("CodeWise Gemini error:", error);
    const status = statusOf(error);
    return {
      text: status === 401 || status === 403
        ? "Gemini authentication failed. Please check GEMINI_API_KEY in backend/.env."
        : "I couldn't reach Gemini right now. CodeWise is still running. Please try again in a moment.",
      source: "fallback"
    };
  } finally {
    await Promise.all(temp.map(file => fs.unlink(file).catch(() => {})));
  }
}
