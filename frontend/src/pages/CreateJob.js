import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import Navbar from "../components/Navbar";
import "../CreateJob.css";

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

function CreateJob() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("teknik");
  const [type, setType] = useState("online");
  const [country, setCountry] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [city, setCity] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="create-job-container">
          <p className="login-prompt">
            Du måste vara inloggad för att skapa jobb.{" "}
            <span className="link" onClick={() => navigate("/login")}>
              Logga in
            </span>
          </p>
        </div>
      </>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("type", type);
    if (type === "irl") {
      formData.append("country", country);
      formData.append("municipality", municipality);
      formData.append("city", city);
    }
    if (image) {
      formData.append("image", image);
    }

    try {
      await apiFetch("/jobs", {
        method: "POST",
        body: formData,
      });
      navigate("/hitta-jobb");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar />
      <div className="create-job-container">
        <h1>Skapa nytt jobb</h1>

        {error && <p className="form-error">{error}</p>}

        <form onSubmit={handleSubmit} className="create-job-form">
          <label>Titel</label>
          <input
            type="text"
            placeholder="Jobbets titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
          />

          <label>Beskrivning</label>
          <textarea
            placeholder="Beskriv jobbet..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={5}
            required
          />

          <label>Pris (SEK)</label>
          <input
            type="number"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={0}
            required
          />

          <label>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>

          <label>Typ</label>
          <div className="type-toggle">
            <button
              type="button"
              className={type === "online" ? "active" : ""}
              onClick={() => setType("online")}
            >
              Online
            </button>
            <button
              type="button"
              className={type === "irl" ? "active" : ""}
              onClick={() => setType("irl")}
            >
              IRL
            </button>
          </div>

          {type === "irl" && (
            <div className="location-fields">
              <label>Ort</label>
              <input
                type="text"
                placeholder="Ort"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <label>Kommun</label>
              <input
                type="text"
                placeholder="Kommun"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
              <label>Stad</label>
              <input
                type="text"
                placeholder="Stad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          )}

          <label>Bild (valfritt)</label>
          <div
            className="file-upload-btn"
            onClick={() => document.getElementById("job-image-input").click()}
          >
            {image ? image.name : "Välj bild..."}
          </div>
          <input
            id="job-image-input"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => setImage(e.target.files[0])}
            style={{ display: "none" }}
          />

          <button type="submit" className="submit-btn">
            Publicera jobb
          </button>
        </form>
      </div>
    </>
  );
}

export default CreateJob;
