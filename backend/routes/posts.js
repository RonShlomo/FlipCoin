import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import pool from "../config/db.js";
import fetch from "node-fetch";
import cron from "node-cron";
import { getReddit } from "../reddit.js";

dotenv.config();
const router = express.Router();

let cachedData = null;
let lastUpdated = null;
const apiKey = process.env.COINGECKO_API_KEY;

async function fetchCryptoPrices() {
  try {
    const assetsRes = await pool.query("SELECT name FROM crypto_assets");
    const allCoins = assetsRes.rows.map((r) => r.name).join(",");
    const currencies = "usd,eur,ils";

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${allCoins}&vs_currencies=${currencies}`;
    const headers = {
      accept: "application/json",
      "x-cg-demo-api-key": apiKey,
    };

    const res = await axios.get(url, { headers });
    cachedData = res.data;
    lastUpdated = new Date().toISOString();
  } catch (err) {
    console.error("Error fetching crypto prices:", err.message);
  }
}

fetchCryptoPrices();
setInterval(fetchCryptoPrices, 5 * 60 * 1000);

router.post("/prices", async (req, res) => {
  const { userId } = req.body;

  if (!cachedData) return res.status(503).json({ error: "Data not ready yet" });

  try {
    const query = `
      SELECT c.name
      FROM user_assets ua
      JOIN crypto_assets c ON ua.asset_id = c.id
      WHERE ua.user_id = $1;
    `;
    const result = await pool.query(query, [userId]);
    const userCoins = result.rows.map((r) => r.name.toLowerCase());

    if (!userCoins.length)
      return res.json({ message: "User has no tracked assets" });

    const filteredData = Object.fromEntries(
      Object.entries(cachedData).filter(([symbol]) =>
        userCoins.includes(symbol)
      )
    );

    res.json({ userId, lastUpdated, data: filteredData });
  } catch (err) {
    console.error("Error fetching user data:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const API_KEY = process.env.CRYPTOPANIC_API_KEY;
const PANIC_URL = "https://cryptopanic.com/api/developer/v2/posts/";

async function fetchAndStoreCryptopanicPosts() {
  try {
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM cryptopanic_posts"
    );
    const postCount = parseInt(countResult.rows[0].count);
    if (postCount >= 50) {
      return;
    }
    const response = await fetch(`${PANIC_URL}?auth_token=${API_KEY}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    const results = data.results || [];

    const posts = results.map((item) => ({
      post_id: item.id,
      title: item.title,
      published_at: item.published_at,
      kind: item.kind,
      description: item.description || null,
      slug: item.slug,
    }));

    for (const post of posts) {
      await pool.query(
        `INSERT INTO cryptopanic_posts (post_id, title, published_at, kind, description, slug)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (post_id) DO UPDATE
         SET title=EXCLUDED.title,
             published_at=EXCLUDED.published_at,
             kind=EXCLUDED.kind,
             description=EXCLUDED.description,
             slug=EXCLUDED.slug;`,
        [
          post.post_id,
          post.title,
          post.published_at,
          post.kind,
          post.description,
          post.slug,
        ]
      );
    }
  } catch (err) {
    console.error("Error fetching or saving Cryptopanic posts:", err.message);
  }
}

fetchAndStoreCryptopanicPosts();
setInterval(fetchAndStoreCryptopanicPosts, 12 * 60 * 60 * 1000);

router.post("/news", async (req, res) => {
  try {
    const { userId } = req.body;
    const userContentResult = await pool.query(
      "SELECT content_type_id FROM user_content_types WHERE user_id = $1",
      [userId]
    );

    const contentTypeIds = userContentResult.rows.map(
      (row) => row.content_type_id
    );

    const allowedKinds = ["news"];
    if (contentTypeIds.includes(3) || contentTypeIds.includes(4)) {
      allowedKinds.push("media", "blog", "twitter", "reddit");
    }

    const { rows } = await pool.query(
      `SELECT id, post_id, title, published_at, kind, description, slug, link
       FROM cryptopanic_posts
       WHERE kind = ANY($1)
       ORDER BY published_at DESC
       LIMIT 100`,
      [allowedKinds]
    );

    res.json({ posts: rows });
  } catch (err) {
    console.error("Error fetching news from DB:", err.message);
    res.status(500).json({ error: "Failed to fetch news from database" });
  }
});

async function fetchAndStoreMemes() {
  try {
    const reddit = getReddit();
    const subreddit = await reddit.getSubreddit("cryptocurrencymemes");
    const posts = await subreddit.getHot({ limit: 200 });

    const memes = posts
      .filter((p) => p.url && /\.(jpg|png|gif)$/.test(p.url))
      .map((p) => ({
        post_id: p.id,
        title: p.title,
        published_at: new Date(p.created_utc * 1000),
        kind: "meme",
        description: p.selftext || "",
        slug: p.title.replace(/\s+/g, "-"),
        url: p.url,
        link: `https://reddit.com${p.permalink}`,
      }));

    for (const meme of memes) {
      await pool.query(
        `INSERT INTO memes (post_id, title, published_at, kind, description, slug, url, link)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (post_id) DO NOTHING`,
        [
          meme.post_id,
          meme.title,
          meme.published_at,
          meme.kind,
          meme.description,
          meme.slug,
          meme.url,
          meme.link,
        ]
      );
    }
  } catch (err) {
    console.error("Error fetching memes:", err);
  }
}

cron.schedule("0 0 * * *", () => {
  fetchAndStoreMemes();
});

router.get("/memes", async (req, res) => {
  try {
    const countResult = await pool.query("SELECT COUNT(*) FROM memes");
    const memeCount = parseInt(countResult.rows[0].count);

    if (memeCount < 50) {
      await fetchAndStoreMemes();
    }

    const result = await pool.query(
      "SELECT * FROM memes ORDER BY RANDOM() LIMIT 100"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch memes" });
  }
});

router.get("/insight", async (req, res) => {
  try {
        const response = await axios.get("https://flipcoin-python-server.onrender.com/insight", {
          params: { text: "Give one concise crypto tip" }
        });
        const tip = response.data.output;
        const insertResult = await pool.query(
      `INSERT INTO ai_insights (content)
       VALUES ($1)
       ON CONFLICT (content) DO NOTHING
       RETURNING id, content;`,
      [tip]
    );
    let insight;
    if (insertResult.rows.length > 0) {
      insight = insertResult.rows[0];
    } else {
      const selectResult = await pool.query(
        `SELECT id, content FROM ai_insights WHERE content = $1`,
        [tip]
      );
      insight = selectResult.rows[0];
    }
    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const { userId, contentId, contentType, liked } = req.body;

    const existing = await pool.query(
      `SELECT liked
       FROM user_content_feedback
       WHERE user_id = $1 AND content_id = $2 AND content_type = $3;`,
      [userId, contentId, contentType]
    );

    if (existing.rows.length > 0) {
      const currentLiked = existing.rows[0].liked;

      if (currentLiked === liked) {
        await pool.query(
          `UPDATE user_content_feedback
           SET liked = NULL
           WHERE user_id = $1 AND content_id = $2 AND content_type = $3;`,
          [userId, contentId, contentType]
        );
        return res.json({ success: true, action: "cleared" });
      }

      await pool.query(
        `UPDATE user_content_feedback
         SET liked = $4
         WHERE user_id = $1 AND content_id = $2 AND content_type = $3;`,
        [userId, contentId, contentType, liked]
      );

      return res.json({ success: true, action: "updated" });
    }

    await pool.query(
      `INSERT INTO user_content_feedback (user_id, content_id, content_type, liked)
       VALUES ($1, $2, $3, $4);`,
      [userId, contentId, contentType, liked]
    );

    res.json({ success: true, action: "created" });
  } catch (err) {
    console.error("Error saving feedback:", err.message);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;
