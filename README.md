
# Backend 
cd backend
.\venv\Scripts\Activate.ps1       
uvicorn app.main:app --reload      

# Frontend 
cd frontend
npm install
npm run dev                       
