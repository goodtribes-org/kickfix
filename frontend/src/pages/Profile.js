import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import Navbar from "../components/Navbar";
import "../Profile.css";

function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("my-jobs");
  const [myJobs, setMyJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [economy, setEconomy] = useState({ income: 0, expenses: 0, transactions: [] });

  useEffect(() => {
    if (!user) return;

    if (tab === "my-jobs") {
      apiFetch("/jobs/user/my-jobs")
        .then(setMyJobs)
        .catch(() => {});
    } else if (tab === "accepted") {
      apiFetch("/jobs/user/accepted-jobs")
        .then(setAcceptedJobs)
        .catch(() => {});
    } else if (tab === "economy") {
      apiFetch("/payments/history")
        .then(setEconomy)
        .catch(() => {});
    }
  }, [user, tab]);

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="profile-container">
          <p className="login-prompt">
            Du måste vara inloggad.{" "}
            <span className="link" onClick={() => navigate("/login")}>
              Logga in
            </span>
          </p>
        </div>
      </>
    );
  }

  async function handleComplete(jobId) {
    try {
      await apiFetch(`/jobs/${jobId}/complete`, { method: "PUT" });
      setMyJobs((prev) =>
        prev.map((j) => (j._id === jobId ? { ...j, status: "completed" } : j))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(jobId) {
    if (!window.confirm("Vill du verkligen ta bort detta jobb?")) return;
    try {
      await apiFetch(`/jobs/${jobId}`, { method: "DELETE" });
      setMyJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (err) {
      alert(err.message);
    }
  }

  const statusLabels = {
    open: "Öppet",
    accepted: "Accepterat",
    completed: "Klart",
    cancelled: "Avbrutet",
  };

  return (
    <>
      <Navbar />
      <div className="profile-container">
        <h1>Profil</h1>
        <p className="profile-email">{user.email}</p>

        <div className="profile-tabs">
          <button
            className={tab === "my-jobs" ? "active" : ""}
            onClick={() => setTab("my-jobs")}
          >
            Mina jobb
          </button>
          <button
            className={tab === "accepted" ? "active" : ""}
            onClick={() => setTab("accepted")}
          >
            Accepterade jobb
          </button>
          <button
            className={tab === "economy" ? "active" : ""}
            onClick={() => setTab("economy")}
          >
            Min ekonomi
          </button>
        </div>

        {tab === "my-jobs" && (
          <div className="tab-content">
            {myJobs.length === 0 ? (
              <p className="empty-text">Du har inte skapat några jobb ännu.</p>
            ) : (
              <div className="job-list">
                {myJobs.map((job) => (
                  <div key={job._id} className="profile-job-card">
                    <div className="profile-job-info">
                      <h3>{job.title}</h3>
                      <span className={`status status-${job.status}`}>
                        {statusLabels[job.status]}
                      </span>
                      <p className="profile-job-price">{job.price} SEK</p>
                      {job.acceptedBy && (
                        <p className="profile-job-accepted">
                          Accepterat av: {job.acceptedBy.email}
                        </p>
                      )}
                    </div>
                    <div className="profile-job-actions">
                      {job.status === "accepted" && (
                        <>
                          <button
                            className="complete-btn"
                            onClick={() => handleComplete(job._id)}
                          >
                            Markera klart
                          </button>
                          <button
                            className="message-btn"
                            onClick={() => navigate(`/meddelanden/${job._id}`)}
                          >
                            Meddelanden
                          </button>
                        </>
                      )}
                      {job.status === "completed" && (
                        <button
                          className="message-btn"
                          onClick={() => navigate(`/meddelanden/${job._id}`)}
                        >
                          Meddelanden
                        </button>
                      )}
                      {(job.status === "open" || job.status === "completed") && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(job._id)}
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "accepted" && (
          <div className="tab-content">
            {acceptedJobs.length === 0 ? (
              <p className="empty-text">Du har inte accepterat några jobb ännu.</p>
            ) : (
              <div className="job-list">
                {acceptedJobs.map((job) => (
                  <div key={job._id} className="profile-job-card">
                    <div className="profile-job-info">
                      <h3>{job.title}</h3>
                      <span className={`status status-${job.status}`}>
                        {statusLabels[job.status]}
                      </span>
                      <p className="profile-job-price">{job.price} SEK</p>
                      <p className="profile-job-accepted">
                        Skapad av: {job.createdBy?.email}
                      </p>
                    </div>
                    <div className="profile-job-actions">
                      {(job.status === "accepted" || job.status === "completed") && (
                        <button
                          className="message-btn"
                          onClick={() => navigate(`/meddelanden/${job._id}`)}
                        >
                          Meddelanden
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "economy" && (
          <div className="tab-content">
            <div className="economy-cards">
              <div className="economy-card income">
                <h3>Inkomst</h3>
                <p className="economy-amount">{economy.income} SEK</p>
              </div>
              <div className="economy-card expenses">
                <h3>Utgifter</h3>
                <p className="economy-amount">{economy.expenses} SEK</p>
              </div>
            </div>
            <div className="stripe-placeholder">
              <p>Betalningar via Stripe kommer snart.</p>
              <button className="stripe-btn" disabled>
                Anslut Stripe
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Profile;
