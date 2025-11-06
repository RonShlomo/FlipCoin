import { useState, useEffect } from "react";

export default function AIInsight({ onContentLoad }) {
  const [insight, setInsight] = useState("Loading AI insight...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5050/posts/insight");
        const data = await res.json();
        console.log("data: ", data);
        setInsight(data.insight.content);
        if (onContentLoad && data?.insight?.id) {
          onContentLoad(data.insight.id);
        }
      } catch (err) {
        console.error(err);
        setInsight("Failed to load insight.");
      } finally {
        setLoading(false);
      }
    };
    fetchInsight();
  }, []);

  if (loading) return <p>Loading insight...</p>;

  return (
    <div className="ai-insight">
      <p>{insight}</p>
    </div>
  );
}
