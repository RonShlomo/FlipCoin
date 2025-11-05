import { useEffect, useState } from "react";

export default function News({ userId, onContentLoad }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("http://localhost:5050/posts/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw new Error("Server error");

        const data = await res.json();

        if (data.posts && data.posts.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.posts.length);
          const selectedPost = data.posts[randomIndex];
          setPost(selectedPost);
          if (onContentLoad && selectedPost.id) {
            onContentLoad(selectedPost.id);
          }
        } else {
          console.warn("No news found");
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  useEffect(() => {}, [post]);

  if (loading) return <p>Loading news...</p>;
  if (!post) return <p>No news available.</p>;

  return (
    <div
      style={{
        width: "60%",
        margin: "2rem auto",
        border: "1px solid #ccc",
        borderRadius: "12px",
        padding: "1.5rem",
        backgroundColor: "#fafafa",
      }}
    >
      <h2>{post.title}</h2>
      <p style={{ color: "#666" }}>
        {new Date(post.published_at).toLocaleString()}
      </p>
      <p>{post.description}</p>
      <a
        href={`https://cryptopanic.com/news/${post.post_id}/${post.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#007bff", textDecoration: "none" }}
      >
        Continue Reading at CryptoPanic.com →
      </a>
    </div>
  );
}
