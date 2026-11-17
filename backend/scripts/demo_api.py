"""Live API demo. Start the backend first, then:  python scripts/demo_api.py"""
import sys, uuid
from io import BytesIO
import httpx
from pypdf import PdfWriter

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=15)
step = 0


def show(title, r, extra=""):
    global step
    step += 1
    print(f"{step:>2}. {title:<52} -> {r.status_code} {extra}")


def hdr(tok): return {"Authorization": f"Bearer {tok}"}


def pdf():
    w = PdfWriter(); w.add_blank_page(width=200, height=200)
    b = BytesIO(); w.write(b); return b.getvalue()


tag = uuid.uuid4().hex[:6]
r = c.post("/api/auth/register", json={"full_name": "Demo Candidate", "email": f"cand{tag}@demo.com", "password": "password123"})
show("Register candidate", r, r.json()["user"]["role"]); cand = r.json()
r = c.post("/api/auth/register", json={"full_name": "Demo Recruiter", "email": f"rec{tag}@demo.com", "password": "password123", "role": "recruiter"})
show("Register recruiter", r, r.json()["user"]["role"]); rec = r.json()
r = c.post("/api/auth/register", json={"full_name": "Hacker", "email": f"h{tag}@demo.com", "password": "password123", "role": "admin"})
show("Try to self-register as admin (must fail)", r)
r = c.post("/api/auth/login", json={"email": f"cand{tag}@demo.com", "password": "wrongpass"})
show("Login with wrong password (must fail)", r)
r = c.post("/api/auth/refresh", json={"refresh_token": cand["refresh_token"]})
show("Refresh token", r)
r = c.get("/api/users", headers=hdr(cand["access_token"]))
show("Candidate lists all users (must be forbidden)", r)
r = c.post("/api/resumes", headers=hdr(cand["access_token"]), files={"file": ("resume.pdf", pdf(), "application/pdf")})
show("Candidate uploads PDF resume", r, f"primary={r.json()['is_active']}"); rid = r.json()["id"]
r = c.post("/api/resumes", headers=hdr(cand["access_token"]), files={"file": ("notes.txt", b"hello", "text/plain")})
show("Candidate uploads a .txt (must fail)", r, r.json()["detail"])
r = c.get("/api/users/candidates", headers=hdr(rec["access_token"]))
show("Recruiter lists candidates", r, f"{len(r.json())} found")
r = c.get(f"/api/resumes/{rid}/download", headers=hdr(rec["access_token"]))
show("Recruiter downloads the resume", r, f"{len(r.content)} bytes")
r = c.post("/api/auth/login", json={"email": "admin@smarthire.ai", "password": "Admin@12345"})
show("Admin login", r); adm = r.json()
r = c.patch(f"/api/users/{cand['user']['id']}/active", params={"is_active": False}, headers=hdr(adm["access_token"]))
show("Admin disables the candidate", r, f"is_active={r.json()['is_active']}")
r = c.post("/api/auth/login", json={"email": f"cand{tag}@demo.com", "password": "password123"})
show("Disabled candidate tries to log in (must fail)", r, r.json()["detail"])
