import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <h2 className="logo" onClick={() => navigate("/")}>
        WorkApp
      </h2>

      <div className="nav-links">
        <span onClick={() => navigate("/")}>Hem</span>
        <span onClick={() => navigate("/hitta-jobb")}>Hitta jobb</span>
        {user ? (
          <>
            <span onClick={() => navigate("/skapa-jobb")}>Skapa jobb</span>
            <span onClick={() => navigate("/profil")}>Profil</span>
            <span className="logout-btn" onClick={handleLogout}>Logga ut</span>
          </>
        ) : (
          <span onClick={() => navigate("/login")}>Logga in</span>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
