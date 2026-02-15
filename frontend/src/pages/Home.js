import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../Home.css";

const categories = [
  { key: "teknik", label: "Teknik" },
  { key: "design", label: "Design" },
  { key: "skrivande", label: "Skrivande" },
  { key: "marknadsföring", label: "Marknadsföring" },
  { key: "översättning", label: "Översättning" },
  { key: "hushåll", label: "Hushåll" },
  { key: "trädgård", label: "Trädgård" },
  { key: "flytt", label: "Flytt" },
  { key: "renovering", label: "Renovering" },
  { key: "undervisning", label: "Undervisning" },
  { key: "övrigt", label: "Övrigt" },
];

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <div className="hero">
        <h1>Välkommen till WorkApp</h1>
        <p>Din marknadsplats för jobb och tjänster</p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate("/hitta-jobb")}>
            Hitta jobb
          </button>
          <button className="btn-secondary" onClick={() => navigate("/skapa-jobb")}>
            Lägg upp jobb
          </button>
        </div>
      </div>

      <div className="home-container">
        <h2 className="section-title">Hur det fungerar</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Skapa konto</h3>
            <p>Registrera dig gratis och kom igång på några sekunder</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Lägg upp eller hitta jobb</h3>
            <p>Publicera ditt uppdrag eller bläddra bland tillgängliga jobb</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Få betalt</h3>
            <p>Slutför uppdraget och få betalning säkert via plattformen</p>
          </div>
        </div>

        <h2 className="section-title">Jobbkategorier</h2>
        <div className="category-grid">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className="category-card"
              onClick={() => navigate(`/hitta-jobb?category=${cat.key}`)}
            >
              <h3>{cat.label}</h3>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Home;
