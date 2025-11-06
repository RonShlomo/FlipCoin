import React, { useState, useEffect } from "react";
import "./Section.css";

const Section = ({ title, children, userId, contentType }) => {
  const [feedback, setFeedback] = useState(null);
  const [contentId, setContentId] = useState(
    title === "Coin Prices" ? 1 : null
  );

  const [pendingFeedback, setPendingFeedback] = useState(null);

  const postFeedback = async (liked) => {
    if (!contentId) return;
    try {
      const response = await fetch(
        "https://flipcoin-express-server.onrender.com/posts/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, contentId, contentType, liked }),
        }
      );
      const result = await response.json();
      if (result.action === "cleared") setFeedback(null);
      else setFeedback(liked ? "like" : "dislike");
    } catch (err) {
      console.error("Error sending feedback:", err);
    }
  };

  const handleClick = (liked) => {
    if (!contentId) {
      setPendingFeedback(liked);
    } else {
      postFeedback(liked);
    }
  };

  useEffect(() => {
    if (contentId !== null && pendingFeedback !== null) {
      postFeedback(pendingFeedback);
      setPendingFeedback(null);
    }
  }, [contentId, pendingFeedback]);

  const wrappedChildren = React.Children.map(children, (child) =>
    React.cloneElement(child, { onContentLoad: setContentId })
  );

  return (
    <div
      className="section"
      style={{
        backgroundColor: "#dddca1ff",
        borderRadius: "12px",
        boxShadow: "10px 10px 5px rgba(0,0,0,0.1)",
        padding: "15px",
        marginBottom: "20px",
      }}
    >
      <h3>{title}</h3>
      <div className="content">{wrappedChildren}</div>
      <div style={{ marginTop: "10px", marginBottom: "25px" }}>
        <button
          className="LikeButton"
          onClick={() => {
            handleClick(true);
          }}
          style={{
            backgroundColor: feedback === "like" ? "#a6f3a6" : "",
            borderRadius: "8px",
            padding: "5px 10px",
          }}
        >
          👍
        </button>
        <button
          className="LikeButton"
          onClick={() => handleClick(false)}
          style={{
            marginLeft: "10px",
            backgroundColor: feedback === "dislike" ? "#f7a6a6" : "",
            borderRadius: "8px",
            padding: "5px 10px",
          }}
        >
          👎
        </button>
      </div>
    </div>
  );
};

export default Section;
