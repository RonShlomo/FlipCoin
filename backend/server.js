import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Snoowrap from "snoowrap";
import userRouter from "./routes/users.js";
import postRouter from "./routes/posts.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const reddit = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});
export default reddit;

app.use("/users", userRouter);
app.use("/posts", postRouter);

app.listen(5050, () => console.log("Server running on port 5050"));
