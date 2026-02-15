import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import CreateJob from "./pages/CreateJob";
import FindJob from "./pages/FindJob";
import Profile from "./pages/Profile";
import ChatPage from "./pages/ChatPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/skapa-jobb" element={<CreateJob />} />
          <Route path="/hitta-jobb" element={<FindJob />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/meddelanden/:jobId" element={<ChatPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
