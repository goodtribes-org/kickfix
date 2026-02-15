import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import "../ChatPage.css";

function ChatPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    apiFetch(`/jobs/${jobId}`)
      .then(setJob)
      .catch(() => {});
  }, [user, jobId]);

  useEffect(() => {
    if (!user) return;

    function fetchMessages() {
      apiFetch(`/messages/${jobId}`)
        .then(setMessages)
        .catch(() => {});
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [user, jobId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const msg = await apiFetch(`/messages/${jobId}`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
    } catch (err) {
      alert(err.message);
    }
    setSending(false);
  }

  if (!user) {
    return (
      <div className="chat-container">
        <p>Du måste vara inloggad.</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate("/profil")}>
          &larr; Tillbaka
        </button>
        {job && (
          <div className="chat-job-info">
            <h2>{job.title}</h2>
            <span className="chat-job-price">{job.price} SEK</span>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Inga meddelanden ännu. Skriv det första!</p>
        )}
        {messages.map((msg) => {
          const isOwn = (msg.sender._id || msg.sender.id) === user.userId;
          return (
            <div
              key={msg._id || msg.id}
              className={`chat-bubble ${isOwn ? "chat-bubble-own" : "chat-bubble-other"}`}
            >
              <span className="chat-sender">{msg.sender.email}</span>
              <p className="chat-content">{msg.content}</p>
              <span className="chat-time">
                {new Date(msg.createdAt).toLocaleString("sv-SE")}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Skriv ett meddelande..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" className="chat-send-btn" disabled={sending || !newMessage.trim()}>
          Skicka
        </button>
      </form>
    </div>
  );
}

export default ChatPage;
