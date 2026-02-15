import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import JobCard from "../components/JobCard";
import "../FindJob.css";

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

          {jobs.length === 0 ? (
            <p className="no-results">Inga jobb hittades</p>
          ) : (
            <div className="job-grid">
              {jobs.map((job) => (
                <JobCard key={job._id || job.id} job={job} onUpdate={fetchJobs} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FindJob;
