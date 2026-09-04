# Firebase Authentication Setup Guide for SEAM

This guide describes how to configure Firebase Authentication for the SEAM Autonomous Software Engineering IDE platform.

---

## 1. Create a Firebase Project

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g., `seam-ai-platform`).
4. Choose whether to enable Google Analytics (optional).
5. Click **Create project** and wait for provisioning to complete.

---

## 2. Register a Web App

1. In the Firebase Console Project Overview, click the **Web** icon (`</>`) to add a web application.
2. Enter an app nickname (e.g., `SEAM Web Client`).
3. *(Optional)* Firebase Hosting setup is not required for local development.
4. Click **Register app**.
5. Firebase will present a configuration snippet containing keys such as:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef..."
   };
   ```

---

## 3. Enable Authentication Sign-In Methods

1. In the Firebase Console left navigation menu, go to **Build > Authentication**.
2. Click **Get started**.
3. Select the **Sign-in method** tab.

### A. Email/Password Provider
1. Under **Native providers**, click **Email/Password**.
2. Toggle **Enable** to active.
3. Keep *Email link (passwordless sign-in)* disabled unless explicitly needed.
4. Click **Save**.

### B. Google Provider
1. Under **Additional providers**, click **Google**.
2. Toggle **Enable** to active.
3. Choose a public-facing support email for the project.
4. Click **Save**.

---

## 4. Configure Authorized Domains

1. On the **Authentication > Settings > Authorized domains** tab, verify the allowed domains.
2. By default, `localhost` is included.
3. If running on a custom development port, IP, or reverse proxy (e.g. `127.0.0.1`), add that domain explicitly.

---

## 5. Configure Frontend Environment Variables

1. In the `frontend/` directory, copy `.env.example` to `.env`:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. Populate the `.env` file with your web app credentials from Step 2:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef...

   # Backend API Base URL
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. **Security Note**: Never commit your real `.env` file to Git or version control. `.env` is already ignored by `.gitignore`.

---

## 6. Run the Application

Start the frontend development server:
```bash
cd frontend
npm run dev
```

Start the SEAM FastAPI backend:
```bash
python -m uvicorn backend.main:app --port 8000 --host 127.0.0.1
```

Access the application in your browser:
- **Landing / Auth Entry**: `http://localhost:5173/login`
- **Signup Page**: `http://localhost:5173/signup`
- **Dashboard**: `http://localhost:5173/dashboard`
- **Autonomous Project Workspace**: `http://localhost:5173/projects/:projectId`

---

## 7. Backend Authentication & Security Hardening

The FastAPI backend actively verifies Firebase ID tokens using the `firebase-admin` SDK:

### A. Environment Configuration (Backend)
To verify tokens in production or staging, configure one of the following in your backend environment (or `.env`):
- `FIREBASE_PROJECT_ID`: Your Firebase project ID (verifies tokens against Google's public x509 certificates).
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Absolute or relative path to your service account JSON file downloaded from the Firebase Console (Service Accounts tab).
- `FIREBASE_SERVICE_ACCOUNT_JSON`: Raw JSON string of the service account private key (useful in container/cloud deployments).

```env
# Optional Local Dev Token Bypass (Disabled by default)
SEAM_ALLOW_DEV_AUTH=false

# Production / Staging Firebase Admin credentials
FIREBASE_PROJECT_ID=your-firebase-project-id
# or
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

### B. Cryptographic Token Verification
- All requests to `/projects`, `/projects/{id}/*`, and `/ws/projects/{id}/runtime` require an `Authorization: Bearer <idToken>` or a handshake `?token=` parameter.
- The backend decodes and cryptographically validates the token via `firebase_admin.auth.verify_id_token()`.
- Client-supplied UIDs are **never trusted**. The authenticated UID is taken directly from the verified token payload.

### C. Project Ownership & Isolation
- When creating a project via `POST /projects`, the authenticated user's UID is recorded on the `ProjectAggregate` as `owner_id`.
- Accessing a project via `GET /projects/{id}`, executing tasks, saving files, running autonomous orchestration, or deploying checks whether `aggregate.owner_id == current_user.uid`.
- Attempting to access another user's project yields `403 Forbidden`.
- The WebSocket endpoint (`/ws/projects/{id}/runtime`) validates both the token and project ownership before accepting connection (`WS_1008_POLICY_VIOLATION` if unauthorized).

