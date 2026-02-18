import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "../components/Navbar";
import JobCard from "../components/JobCard";
import "../FindJob.css";

// Fix Leaflet default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const categories = [
  { key: "", label: "Alla kategorier" },
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

function FindJob() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [viewMode, setViewMode] = useState("list");

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (type) params.append("type", type);
    if (category) params.append("category", category);
    if (city) params.append("city", city);
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    return params.toString();
  }, [search, type, category, city, minPrice, maxPrice]);

  const fetchJobs = useCallback(async () => {
    try {
      const query = buildQuery();
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_BASE}/jobs?${query}`);
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error("Kunde inte hämta jobb:", err);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function handleSearch(e) {
    e.preventDefault();
    fetchJobs();
  }

  const geoJobs = jobs.filter((job) => job.locationLat && job.locationLng);

  return (
    <>
      <Navbar />
      <div className="find-job-container">
        <div className="find-job-sidebar">
          <h3>Filter</h3>

          <label>Typ</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Alla typer</option>
            <option value="online">Online</option>
            <option value="irl">IRL</option>
          </select>

          <label>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>

          <label>Stad</label>
          <input
            type="text"
            placeholder="Filtrera på stad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <label>Min pris (SEK)</label>
          <input
            type="number"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />

          <label>Max pris (SEK)</label>
          <input
            type="number"
            placeholder="10000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <button className="filter-btn" onClick={fetchJobs}>
            Tillämpa filter
          </button>
        </div>

        <div className="find-job-main">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Sök jobb..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Sök</button>
          </form>

          <div className="view-toggle">
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              Lista
            </button>
            <button
              className={viewMode === "map" ? "active" : ""}
              onClick={() => setViewMode("map")}
            >
              Karta
            </button>
          </div>

          {viewMode === "list" ? (
            jobs.length === 0 ? (
              <p className="no-results">Inga jobb hittades</p>
            ) : (
              <div className="job-grid">
                {jobs.map((job) => (
                  <JobCard key={job._id || job.id} job={job} onUpdate={fetchJobs} />
                ))}
              </div>
            )
          ) : (
            <div className="map-wrapper">
              <MapContainer
                center={[62, 15]}
                zoom={5}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoJobs.map((job) => (
                  <Marker
                    key={job._id || job.id}
                    position={[job.locationLat, job.locationLng]}
                  >
                    <Popup>
                      <strong>{job.title}</strong>
                      <br />
                      {job.price} SEK
                      {job.locationCity && (
                        <>
                          <br />
                          {job.locationCity}
                        </>
                      )}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              {geoJobs.length === 0 && (
                <p className="no-results map-no-results">
                  Inga jobb med platsdata att visa på kartan
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FindJob;
