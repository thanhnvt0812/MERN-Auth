import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/mongodb.js";
import authRoutes from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 4000;

connectDB();

const allowedOrigins = ["http://localhost:5173"];

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
//API endpoints
app.get("/", (req, res) => {
  res.send("It's Work!!!");
});
app.use("/api/auth", authRoutes);
app.use("/api/user", userRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
