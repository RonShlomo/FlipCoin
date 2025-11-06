import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRouter from "./routes/users.js";
import postRouter from "./routes/posts.js";
import { startDailyTipJob } from "./services/dailyTip.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/users", userRouter);
app.use("/posts", postRouter);

startDailyTipJob();

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
