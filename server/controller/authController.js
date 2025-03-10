import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

/**
 * Register a new user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with success status and message.
 */
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.json({ success: false, message: "Please fill all the fields" });
  }

  try {
    // Registration logic will be implemented here
    const existingUser = await userModel.findOne({ email }); // Check if the email already exists
    if (existingUser) {
      return res.json({ success: false, message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    const user = new userModel({ name, email, password: hashedPassword }); // Create a new user
    await user.save(); // Save the user to the database
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }); // Generate a JWT token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return res.json({ success: true, message: "Register successful" });
  } catch (error) {
    // Handle any errors that occur during registration
    res.json({ success: false, message: error.message });
  }
};

/**
 * Login a user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with success status and message.
 */
export const login = async (req, res) => {
  // Login logic
  const { email, password } = req.body;
  if (!email || !password) {
    // Return an error if not all required fields are provided
    return res.json({ success: false, message: "Please fill all the fields" });
  }
  try {
    // Check if the user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      // Return an error if the user does not exist
      return res.json({ success: false, message: "User not found" });
    }
    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Return an error if the password is incorrect
      return res.json({ success: false, message: "Incorrect password" });
    }
    // Generate a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    // Set the JWT cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return res.json({ success: true, message: "Login successful" });
  } catch (error) {
    // Handle any errors that occur during login
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Logout a user.
 *
 * This function clears the JWT cookie and returns a JSON response with a
 * success message.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} JSON response with success status and message.
 */
export const logout = (req, res) => {
  try {
    // Clear the JWT cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    // Return a JSON response with a success message
    res.json({ success: true, message: "Logout successful" });
  } catch (error) {
    // Handle any errors that occur during logout
    return res.json({ success: false, message: error.message });
  }
};
