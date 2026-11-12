import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Interview from "./pages/Interview";
import Report from "./pages/Report";
import History from "./pages/History";
import Analytics from "./pages/Analytics";

function Protected({children}) { const {user}=useAuth(); return user?children:<Navigate to="/login" replace/>; }
export default function App(){return <Routes>
  <Route path="/" element={<Landing/>}/>
  <Route path="/login" element={<Auth/>}/>
  <Route path="/register" element={<Auth mode="register"/>}/>
  <Route path="/app" element={<Protected><Layout/></Protected>}>
    <Route index element={<Dashboard/>}/>
    <Route path="resume" element={<Resume/>}/>
    <Route path="interview" element={<Interview/>}/>
    <Route path="report" element={<Report/>}/>
    <Route path="history" element={<History/>}/>
    <Route path="analytics" element={<Analytics/>}/>
  </Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}