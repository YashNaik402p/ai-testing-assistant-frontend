# AI Software Testing Assistant - Modern Dark Frontend

A modern, responsive, dark-themed frontend for the **AI Software Testing Assistant** built with pure HTML5, CSS3, and JavaScript (ES6+).

---

## 📁 Project Structure

```text
frontend/
├── index.html               # Entry gate: redirects based on auth token
├── login.html               # Login & Register with toggle tabs
├── dashboard.html           # Project management & Recent projects cards
├── upload.html              # Source code input (Paste, Single File, ZIP Archive)
├── files.html               # Files to Analyze queue with status (Pending/Analysed)
├── report.html              # Analysis report, test cases, security audit & smart downloads
├── chat.html                # Scoped interactive AI chat assistant
├── css/
│   ├── common.css           # Global dark theme tokens, buttons, toasts, modals
│   ├── login.css            # Auth layout styles
│   ├── dashboard.css        # Dashboard grid & card styles
│   ├── upload.css           # Dropzone & code editor styles
│   ├── files.css            # File queue table styles
│   ├── report.css           # Metric scorecards & tabbed report styles
│   └── chat.css             # Chat conversation bubble styles
└── js/
    ├── config.js            # API Base URL & language mappings
    ├── api.js               # Centralized fetch wrapper & file download streaming
    ├── auth.js              # Token guard, user profile & logout
    ├── login.js             # Sign in & registration handler
    ├── dashboard.js         # Project listing, search & modal controller
    ├── upload.js            # Single file vs ZIP archive branching logic
    ├── files.js             # File list, status badges & project analysis trigger
    ├── report.js            # Multi-tab report view & smart download triggers
    └── chat.js              # Chat history & real-time messaging
```

---

## 🚀 How to Run Locally

You can serve this frontend using any static web server:

### Option 1: Python HTTP Server (Built-in)
```bash
cd ai-testing-assistant-frontend
python3 -m http.server 3000
```
Then open your browser at: `http://localhost:3000`

### Option 2: Node.js `serve` / `npx`
```bash
npx serve . -p 3000
```

### Option 3: VS Code Live Server
Right-click on `index.html` and click **"Open with Live Server"**.

---

## ⚙️ Backend Configuration

By default, the frontend connects to your FastAPI backend at:
`http://localhost:8000`

To point to a different URL (such as a staging or production server):
Edit `js/config.js`:
```javascript
const CONFIG = {
  API_BASE_URL: 'https://your-production-backend.com',
  // ...
};
```
Or set `window.ENV_API_URL = 'https://your-production-backend.com'` in your deployment HTML template.

---

## 🧭 Page Flow & Architecture

1. **Authentication (`login.html`)**:
   - Toggle between **Sign In** and **Create Account**.
   - Authenticates via `/auth/login` and `/auth/register`.
   - Stores JWT token in `localStorage`.

2. **Dashboard (`dashboard.html`)**:
   - Lists projects via `GET /projects`.
   - Modal to create new projects via `POST /projects`.
   - Filter/Search projects in real-time.
   - For each project:
     - If analysed $\rightarrow$ **"View Report"** button.
     - If not analysed $\rightarrow$ **"Analyse"** button.

3. **Upload Source Code (`upload.html`)**:
   - **Paste Code**: Input code directly $\rightarrow$ triggers `/source-code` and `/analyze` $\rightarrow$ navigates to `report.html`.
   - **Single File**: Upload `.py`, `.js`, etc. $\rightarrow$ triggers `/upload-file` and `/analyze` $\rightarrow$ navigates to `report.html`.
   - **ZIP Archive**: Upload `.zip` project $\rightarrow$ triggers `/upload-zip` $\rightarrow$ extracts files $\rightarrow$ navigates to `files.html`.

4. **Files to Analyze (`files.html`)**:
   - Lists extracted files with status badges (`Analysed` or `Pending`).
   - Run analysis on any pending file with a single click.
   - **"Run Project Analysis"** button triggers `/analyze-project` across the whole codebase.

5. **Report Page (`report.html`)**:
   - Displays Quality Score, Complexity, Security Health, and Test Cases count.
   - Tabbed content:
     - **Overview**: Explanation summary.
     - **Test Cases**: Generated tests table with regenerate option.
     - **Security Review**: Severity alerts, detected issues, and AI recommendations.
     - **Documentation**: Generated technical documentation with markdown preview and copy button.
   - **Smart Download Dropdown**:
     - *Single File*: Downloads documentation as **PDF, Excel, or JSON**.
     - *ZIP Project*: Downloads overall project report as **PDF or JSON**.
   - **Back Button**: Returns to `files.html`.
   - **Chat Button**: Navigates to `chat.html`.

6. **Chat with AI (`chat.html`)**:
   - Interactive conversation history via `GET /projects/{id}/chat`.
   - Real-time queries via `POST /projects/{id}/chat`.
