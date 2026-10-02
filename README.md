# CodeWise

Minimal professional coding and DSA learning app with React, Node.js, MongoDB and Gemini.

## UI
- ChatGPT-style minimal interface
- Bottom composer/search bar
- File + image upload
- 5 modes: Teacher, Explain, Hint, Interview, Debug
- Dark/light theme
- Full chat history in left sidebar
- Sign in/create account at bottom-left
- Account management and deletion

## Smart local replies
Common greetings, small talk, thanks, capability questions, and clearly unrelated topics are answered by CodeWise with predefined responses on the Node.js server. These messages do **not** call the Gemini API.

Coding/DSA questions and messages with uploaded files use Gemini when configured.

## Gemini reliability
Transient Gemini errors such as 429/5xx are retried with backoff. If the primary model remains temporarily unavailable, CodeWise tries `GEMINI_FALLBACK_MODEL` and finally returns a friendly fallback response without crashing the backend.

## Security
- bcrypt password hashing
- JWT authentication
- every chat query is scoped by authenticated user ID
- chat titles/messages encrypted at rest with AES-256-GCM
- each user has a random data key wrapped by a server encryption key
- no admin route exposes user chat data

This is database-at-rest protection, not a mathematically absolute guarantee against an operator with full production server/secret access. True E2E encryption would prevent the backend from sending plaintext content to Gemini.

## Run with one command

1. Set `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `GEMINI_API_KEY` in `backend/.env`.
2. Install once:

```bash
npm install
npm run install:all
```

3. Run everything:

```bash
npm run start:all
```

MongoDB starts in Docker, then backend and frontend start together.

Frontend: http://localhost:5173
Backend: http://localhost:5000

## Generate encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## EmailJS OTP setup

The project supports email OTP verification for signup and OTP-based password reset. EmailJS is used only for delivery; OTP generation, hashing, expiry, attempt limits, and verification stay on the Node.js backend.

1. Create an EmailJS account and connect an email service.
2. Create two templates: signup verification and password reset.
3. Each template should accept the recipient email and include `{{otp}}`; `{{user_name}}` and `{{expires_in}}` are also supplied.
4. Copy the service ID, public key, private key (if enabled), and template IDs into `backend/.env`.

For production, configure an appropriate transactional email service in EmailJS for better deliverability.
