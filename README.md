# 📄 Nova AI – Chat with Your PDFs

Nova AI is an AI-powered PDF assistant built with **Next.js**, **TypeScript**, and **Google Gemini**. Simply upload a PDF and start chatting with it naturally. Nova extracts the text from your document and answers questions using only the uploaded PDF, helping you understand documents faster without searching through pages manually.

> 🚀 **No sign up required. No email required. No personal details required. Simply upload your PDF and start chatting with Nova.**

---

## ✨ Features

- 📄 Upload PDF files (up to 10 MB)
- 🤖 AI-powered document chat
- 📚 Answers generated only from the uploaded document
- ⚡ Fast PDF text extraction
- 💬 Natural language conversations
- 📑 Supports resumes, reports, books, assignments and research papers
- 🎨 Clean and modern responsive interface
- 🔒 No account or personal information required

---

## 🛠️ Tech Stack

### Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Lucide React Icons

### Backend

- Next.js API Routes
- Google Gemini API
- pdf-parse

---

## 📂 Project Structure

```text
app/
├── api/
│   ├── ask/
│   └── extract-pdf/
├── page.tsx
├── layout.tsx
└── globals.css

public/

package.json
```

---

## ⚙️ How It Works

### 1. Upload a PDF

The user uploads a PDF through the interface.

---

### 2. PDF Processing

The application:

- validates the file
- extracts the text
- counts pages
- stores the extracted content temporarily

---

### 3. Ask Questions

Questions are sent to the Gemini API together with the extracted PDF text.

The AI is instructed to answer **only using the uploaded document**.

If the answer cannot be found inside the PDF, Nova will respond that the information is not available in the document instead of making up an answer.

---

## 🚀 Running the Project

### 1. Clone the repository

```bash
git clone https://github.com/Rikita-Shil/pdf-chat.git
...
---

### 2. Open the project

```bash
cd pdf-chat
```

---

### 3. Install dependencies

```bash
npm install
```

---

### 4. Create a `.env.local` file

Add your Gemini API key:

```env
GEMINI_API_KEY=YOUR_API_KEY
```

You can obtain a free API key from Google AI Studio.

---

### 5. Start the development server

```bash
npm run dev
```

Visit

```
http://localhost:3000
```

---

### 6. Build for production

```bash
npm run build
```

---

### 7. Run the production build

```bash
npm start
```

---

## 📖 Example Questions

- Summarise this document.
- What are the key skills?
- What are the important dates?
- Explain this section.
- What experience does this person have?
- List the main responsibilities.
- Give me the important points.

---

## 🔒 Privacy

Nova AI does **not** require:

- ❌ Email address
- ❌ User account
- ❌ Login
- ❌ Personal information

Simply upload your PDF and start chatting.

---

## 🚧 Future Improvements

- 🎓 AI Quiz Generation
- 🃏 Flashcards
- 📝 AI Summaries
- 📌 Notes
- 📊 Learning Progress Dashboard
- 🌙 Dark Mode
- 📄 Multiple PDF Chat
- 🔍 Source Page References

---

## 👨‍💻 Author

**Rikita Shil**

Software Engineering Student | Macquarie University

GitHub: https://github.com/Rikita-Shil

---

## 📜 License

This project is licensed under the MIT License.
