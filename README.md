CORE Engine

CORE is a biological performance decision system that analyzes user inputs and identifies what is limiting performance.

---

🚀 Overview

CORE takes daily biological inputs and converts them into:

- Performance Score (0–100)
- System State (Optimal / Moderate / Low)
- Primary Limiter (Energy / Recovery / Consistency / Training)
- Actionable Insight
- Stored history for tracking progress

---

🧠 Core Idea

Most apps show data.

CORE:
→ Interprets data
→ Finds the limiting factor
→ Guides decisions

---

⚙️ Features

- Google Authentication (Firebase)
- Input-based biological analysis
- Real-time scoring engine
- Firestore database integration
- Session history tracking
- Dashboard with trends and limiter patterns
- Minimal UI focused on decision-making

---

🏗️ Tech Stack

Frontend

- Next.js (App Router)
- React
- Custom CSS

Backend / Services

- Firebase Authentication (Google Sign-In)
- Firestore Database

Deployment

- Vercel

---

🔐 Environment Variables

Create a ".env.local" file in root:

NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=1:xxxxx:web:xxxxx

⚠️ Use values from Firebase → Project Settings → Web App
Do NOT use Google Cloud API keys.

---

🗄️ Firestore Structure

users/{uid}
  - name
  - email
  - createdAt

sessions/{sessionId}
  - userId
  - inputs
  - output
  - primaryLimiter
  - confidence
  - createdAt

---

🔒 Firestore Rules (Production)

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}

---

🔄 User Flow

1. User opens CORE
2. Clicks Find My Limiter
3. Logs in with Google
4. Enters biological inputs
5. CORE analyzes data
6. Result is shown
7. Session is saved
8. User can view history & dashboard

---

📊 Product Vision

CORE is not a fitness tracker.

It is:
→ A biological operating system
→ A decision engine
→ A pattern recognition system over time

---

⚠️ Important Notes

- API key must come from Firebase Web App config
- Do not hardcode secrets
- Always use environment variables
- Firestore rules must be secured before production

---

📦 Installation

git clone https://github.com/your-username/core-engine.git
cd core-engine
npm install
npm run dev

---

🚀 Deployment

Deploy using Vercel:

1. Add environment variables in Vercel
2. Redeploy
3. Ensure Firebase domains include your Vercel URL

---

🧪 Status

Version: V3+

- Auth: ✅
- Analysis Engine: ✅
- Firestore Integration: ✅
- Dashboard: ✅
- Production Setup: ⚠️ (requires proper rules + env config)

---

🧠 Philosophy

CORE focuses on:

- Clarity over complexity
- Insight over data
- Action over tracking

---

📌 Author

Amar Sriram

---
