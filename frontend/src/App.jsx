import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import EventLog from "./pages/EventLog";
import Statistics from "./pages/Statistics";
import DangerZone from "./pages/DangerZone";
import DangerZoneManage from "./pages/DangerZoneManage";
import CctvManage from "./pages/CctvManage";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/event-log" element={<EventLog />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/danger-zone" element={<DangerZone />} />
        <Route path="/danger-zone-manage" element={<DangerZoneManage />} />
        <Route path="/cctv-manage" element={<CctvManage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;