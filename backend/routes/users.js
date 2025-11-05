import express from "express";
import pool from "../config/db.js";
import bcrypt from "bcrypt";
const router = express.Router();
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/authJwt.js";

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, hashedPassword]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "User created successfully",
      data: { id: result.rows[0].id, username },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating user" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const id = user.id;
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      data: {
        id: user.id,
        username: user.username,
      },
      token: token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

router.post("/onboard", verifyToken, async (req, res) => {
  const { assets, investorType, contentType } = req.body;
  const userId = req.user.id;

  try {
    console.log("userID: ", userId);

    const investorResult = await pool.query(
      "SELECT id FROM investor_types WHERE type_name = $1",
      [investorType]
    );
    const investorId = investorResult.rows[0]?.id;

    if (investorId) {
      await pool.query("UPDATE users SET investor_type_id = $1 WHERE id = $2", [
        investorId,
        userId,
      ]);
    }

    await pool.query("DELETE FROM user_assets WHERE user_id = $1", [userId]);

    for (const assetName of assets) {
      const assetResult = await pool.query(
        "SELECT id FROM crypto_assets WHERE name = $1",
        [assetName]
      );
      const assetId = assetResult.rows[0]?.id;
      if (assetId) {
        await pool.query(
          "INSERT INTO user_assets (user_id, asset_id) VALUES ($1, $2)",
          [userId, assetId]
        );
      }
    }

    await pool.query("DELETE FROM user_content_types WHERE user_id = $1", [
      userId,
    ]);

    for (const contentName of contentType) {
      const contentResult = await pool.query(
        "SELECT id FROM content_types WHERE name = $1",
        [contentName]
      );
      const contentId = contentResult.rows[0]?.id;
      if (contentId) {
        await pool.query(
          "INSERT INTO user_content_types (user_id, content_type_id) VALUES ($1, $2)",
          [userId, contentId]
        );
      }
    }

    res
      .status(200)
      .json({ message: "User onboarding data saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving onboarding data" });
  }
});

export default router;
