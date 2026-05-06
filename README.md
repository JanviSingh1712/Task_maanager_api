# 📋 TaskFlow — Task Manager

A full-stack Task Manager with a Node.js/Express REST API and a modern frontend UI.  
Deployable to **Vercel** in one click.

---

## 📁 Project Structure

```
taskflow/
├── vercel.json          ← Vercel routing config (makes deployment work)
├── package.json         ← Dependencies for the API
│
├── api/
│   └── index.js         ← Express app exported as a Vercel serverless function
│
└── frontend/
    ├── index.html        ← App shell
    ├── css/
    │   └── style.css     ← All styles
    └── js/
        └── app.js        ← All frontend logic (CRUD, UI, API calls)
```

---

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (auto-restarts on changes)
npm run dev

# 3. Open in browser
http://localhost:3000
```

---

## ☁️ Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
# Install Vercel CLI globally (once)
npm install -g vercel

# Deploy from project root
vercel

# Follow the prompts:
#  - Link to your Vercel account
#  - Project name: taskflow (or anything)
#  - Framework: Other
#  - Root: ./  (just press Enter)

# Your live URL will be printed, e.g.:
# https://taskflow-abc123.vercel.app
```

### Option B — GitHub + Vercel Dashboard

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Leave all settings as default (Vercel auto-detects `vercel.json`)
5. Click **Deploy**

Done — your app is live! 🎉

---

## 🔑 Why This Works on Vercel

| Problem | Solution |
|---|---|
| Vercel can't run `app.listen()` | We `module.exports = app` instead — Vercel calls it as a function |
| Vercel filesystem is read-only | Tasks stored in-memory (reset on cold start) |
| `localhost:3000` URL breaks on Vercel | Frontend uses **relative URLs** (`/tasks` not `http://localhost:3000/tasks`) |
| Static files need serving | `vercel.json` routes `/*` to `/frontend/$1` |

---

## 🗂️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | Get all tasks |
| GET | `/tasks/:id` | Get task by ID |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| GET | `/api/health` | Health check |

---

## 💾 Persistent Storage (Upgrade Path)

Tasks are in-memory by default (resets on Vercel cold starts).  
To persist data, swap the `tasks` array in `api/index.js` with:

- **MongoDB Atlas** — free tier, works perfectly with Vercel
- **PlanetScale** — serverless MySQL
- **Vercel KV** — built-in Redis key-value store

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js (serverless on Vercel)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Fonts**: Syne + Plus Jakarta Sans
- **Deployment**: Vercel
