import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import "../JobCard.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const UPLOADS_URL = API_URL.replace("/api", "/uploads");

function JobCard({ job, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwner = user && job.createdBy && user.userId === (job.createdBy._id || job.createdBy);
  const isAcceptedByMe = job.status === "accepted" && job.acceptedBy && user && (job.acceptedBy._id || job.acceptedBy) === user.userId;

  async function handleAccept() {
    try {
      await apiFetch(`/jobs/${job._id}/accept`, { method: "PUT" });
      if (onUpdate) onUpdate();
      const goToChat = window.confirm("Jobbet accepterat! Vill du gå till chatten?");
      if (goToChat) {
        navigate(`/meddelanden/${job._id}`);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  const categoryLabels = {
    teknik: "Teknik",
    design: "Design",
    skrivande: "Skrivande",
    "marknadsföring": "Marknadsföring",
    "översättning": "Översättning",
    "hushåll": "Hushåll",
    "trädgård": "Trädgård",
    flytt: "Flytt",
    renovering: "Renovering",
    undervisning: "Undervisning",
    "övrigt": "Övrigt",
  };

  return (
    <div className="job-card">
      {job.image && (
        <img
          src={`${UPLOADS_URL}/${job.image}`}
          alt={job.title}
          className="job-card-image"
        />
      )}
      <div className="job-card-body">
        <div className="job-card-badges">
          <span className={`badge badge-${job.type}`}>
            {job.type === "online" ? "Online" : "IRL"}
          </span>
          <span className="badge badge-category">
            {categoryLabels[job.category] || job.category}
          </span>
        </div>
        <h3 className="job-card-title">{job.title}</h3>
        <p className="job-card-desc">
          {job.description.length > 120
            ? job.description.substring(0, 120) + "..."
            : job.description}
        </p>
        {job.type === "irl" && job.location && job.location.city && (
          <p className="job-card-location">{job.location.city}</p>
        )}
        <div className="job-card-footer">
          <span className="job-card-price">{job.price} SEK</span>
          {user && !isOwner && job.status === "open" && (
            <button className="accept-btn" onClick={handleAccept}>
              Acceptera jobb
            </button>
          )}
          {isAcceptedByMe && (
            <button className="accept-btn" onClick={() => navigate(`/meddelanden/${job._id}`)}>
              Meddelanden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobCard;
