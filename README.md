# CodeWise

CodeWise is an AI-powered DSA learning platform designed to help students understand Data Structures and Algorithms through guided learning instead of simply giving them answers.

It provides AI-powered teaching, explanations, hints, debugging assistance, and interview-style practice in one platform.

---

## What is CodeWise?

Learning DSA can be difficult when students get stuck on a problem and do not know what to try next.

CodeWise acts like an interactive DSA mentor.

Instead of only providing a final solution, the AI can:

- Explain concepts in simple language
- Guide students toward the solution
- Provide small hints
- Help debug incorrect code
- Conduct interview-style practice
- Analyze uploaded images and files
- Maintain conversation history
- Adapt responses based on the selected learning mode

The goal is to help users understand the problem and improve their problem-solving ability.

---

# How the AI Works

CodeWise uses Google's Gemini API as its AI engine.

The application does not simply send the user's message directly to Gemini.

A request passes through several stages before the AI generates a response.

```text
User
  ↓
CodeWise Frontend
  ↓
Authentication
  ↓
Request Validation
  ↓
Request Quota Check
  ↓
Chat History Retrieval
  ↓
Selected AI Mode
  ↓
Prompt Construction
  ↓
Gemini API
  ↓
AI Response
  ↓
Response Processing
  ↓
Encrypted Chat Storage
  ↓
Frontend
  ↓
User
