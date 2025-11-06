import { useEffect, useState, useRef } from "react";

export default function CryptoMeme({ onContentLoad }) {
  const [meme, setMeme] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch("https://flipcoin-express-server.onrender.com/posts/memes")
      .then((res) => res.json())
      .then((data) => {
        const random = data[Math.floor(Math.random() * data.length)];
        setMeme(random);
        if (onContentLoad && random?.id) {
          onContentLoad(random.id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  if (!meme) return <p>Loading meme...</p>;

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <img
        src={meme.url}
        alt={meme.title}
        style={{ borderRadius: "12px", maxHeight: "410px" }}
      />
    </div>
  );
}
