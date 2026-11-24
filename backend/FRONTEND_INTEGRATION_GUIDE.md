# Frontend & Backend Integration Guide (Milestone 1)

This guide explains how your existing **Google Stitch AI React frontend** interacts with the **SmartHire AI FastAPI backend** developed for Milestone 1.

---

## 🌐 1. Backend Server & Base URL

When running locally, your backend listens on:
* **Base URL:** `http://127.0.0.1:8000`
* **API Version 1 Prefix:** `http://127.0.0.1:8000/api/v1`

CORS is already configured to accept requests from React running on `http://localhost:3000` or `http://localhost:5173`.

---

## 🔑 2. Authentication Flow (JWT)

1. When a user submits credentials on the login screen (`smarthire_ai_login`), call `POST /api/v1/auth/login`.
2. The response returns:
   ```json
   {
     "access_token": "eyJhbGciOi...",
     "token_type": "bearer",
     "role": "candidate",
     "user_id": "93a62cb2-...",
     "full_name": "Aarav Mehta"
   }
   ```
3. Store `access_token` and `role` in `localStorage`:
   ```javascript
   localStorage.setItem("token", response.data.access_token);
   localStorage.setItem("user_role", response.data.role);
   ```
4. For all protected endpoints, attach the token in the HTTP Authorization header:
   ```text
   Authorization: Bearer <token>
   ```

---

## 💻 3. Recommended React API Client (`src/services/api.js`)

You can create a reusable Axios or Fetch instance in your React project:

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
});

// Automatically inject JWT Bearer token into outgoing requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
```

---

## 📄 4. Page-to-Endpoint Mapping

| Stitch AI Page Screen | Primary Action | Backend Endpoint | HTTP Method |
| :--- | :--- | :--- | :--- |
| `smarthire_ai_register` | User sign-up | `/api/v1/auth/register` | `POST` |
| `smarthire_ai_login` | User login | `/api/v1/auth/login` | `POST` |
| `smarthire_ai_user_profile` | Load current user profile | `/api/v1/auth/me` | `GET` |
| `smarthire_ai_user_profile` | Update candidate profile | `/api/v1/users/me/candidate-profile` | `PUT` |
| `smarthire_ai_user_profile` | Update recruiter profile | `/api/v1/users/me/recruiter-profile` | `PUT` |
| `smarthire_ai_account_settings` | Update basic user details | `/api/v1/users/me` | `PUT` |
| `smarthire_ai_my_resume` | Upload candidate resume | `/api/v1/resumes/upload` | `POST` (Multipart) |
| `smarthire_ai_my_resume` | View candidate's resumes | `/api/v1/resumes/my-resumes` | `GET` |
| `smarthire_ai_my_resume` | Delete resume | `/api/v1/resumes/{id}` | `DELETE` |
| `smarthire_ai_recruiter_candidate_management` | Browse candidate directory | `/api/v1/users/candidates` | `GET` |
| `smarthire_ai_admin_dashboard` | Manage platform users | `/api/v1/users/admin/users` | `GET` |

---

## 📤 5. Resume Upload Code Example (`smarthire_ai_my_resume`)

When the candidate selects a resume file, use JavaScript `FormData`:

```javascript
import API from "./api";

export async function uploadResume(file, isPrimary = true) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("is_primary", isPrimary);

  const response = await API.post("/resumes/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
```

---

## 🔀 6. Role-Based Navigation Routing

Upon successful login, redirect the user according to their role returned by the login response:

```javascript
if (role === "candidate") {
  navigate("/candidate-dashboard");  // smarthire_ai_candidate_dashboard
} else if (role === "recruiter") {
  navigate("/recruiter-dashboard");  // smarthire_ai_recruiter_dashboard
} else if (role === "admin") {
  navigate("/admin-dashboard");      // smarthire_ai_admin_dashboard
}
```
