const normalize = value => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Only these three greetings are handled locally.
// Every other message is sent to Gemini (unless it includes an attachment,
// in which case Gemini is always used so the attachment can be analysed).
export function getPredefinedReply(input) {
  const text = normalize(input);
  if (!text) return null;

  if (text === "hello") {
    return "Hello! 👋 How can I help you today?";
  }

  if (text === "hii") {
    return "Hii! 👋 What would you like to work on today?";
  }

  if (text === "good morning") {
    return "Good morning! ☀️ What would you like to work on today?";
  }

  return null;
}
