import { useState, useEffect } from "react";

export default function AIInsight({ onContentLoad }) {
  const [tip, setTip] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTip() {
      try {
        const res = await fetch(
          "https://flipcoin-express-server.onrender.com/posts/tip"
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTip(data.tip);
        onContentLoad?.(data.tip);
      } catch (err) {
        console.error(err);
        setError("Failed to load tip");
      } finally {
        setLoading(false);
      }
    }

    fetchTip();
  }, [onContentLoad]);

  if (loading) return <p>Loading insight...</p>;

  return (
    <div className="ai-insight">
      <p>{tip}</p>
    </div>
  );
}
