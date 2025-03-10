import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";

/**
 * Register a new user.
 *
 * This function will check if all required fields are provided, check if the
 * email already exists in the database, hash the password, create a new user,
 * save the user to the database, generate a JWT token, and set it as a cookie
 * in the response.
 *
 */
export const register = async (req, res) => {
  // Get the name, email, and password from the request body
  const { name, email, password } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password) {
    // Return an error if not all required fields are provided
    return res.json({ success: false, message: "Please fill all the fields" });
  }

  try {
    const existingUser = await userModel.findOne({ email }); // Check if the email already exists
    if (existingUser) {
      // Return an error if the email already exists
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

    // Sending welcoming email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to MERN-Auth",
      text: `Hello ${name}, welcome to MERN-Auth!. Your account has been created successfully with email id: ${email}`,
    };

    await transporter.sendMail(mailOptions);

    // Return a JSON response with a success message
    return res.json({ success: true, message: "Register successful" });
  } catch (error) {
    // Handle any errors that occur during registration
    res.json({ success: false, message: error.message });
  }
};

/**
 * Login a user.
 *
 * This function will check if the user exists and if the provided password
 * matches the hashed password in the database. If both checks pass, it will
 * generate a JWT token and set it as a cookie in the response.
 *
 */
export const login = async (req, res) => {
  // Get the email and password from the request body
  const { email, password } = req.body;

  // Check if all required fields are provided
  if (!email || !password) {
    // Return an error if not all required fields are provided
    return res.json({ success: false, message: "Please fill all the fields" });
  }

  try {
    // Check if the user exists
    const user = await userModel.findOne({ email });

    // Return an error if the user does not exist
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, user.password);

    // Return an error if the password is incorrect
    if (!isMatch) {
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

    // Return a JSON response with a success message
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

/**
 * Send a verification OTP to the user's email address.
 *
 * This function will check if the user is already verified, and return an error
 * if they are. If not, it will generate a random 6-digit OTP, set the OTP
 * expiration time to 24 hours, and send the OTP to the user's email
 * address using Nodemailer.
 *
 */
export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    if (user.isAccountVerified) {
      // Return an error if the user is already verified
      return res.json({ success: false, message: "Account Already Verified" });
    }
    // Generate a random 6-digit OTP
    const otp = String(Math.floor(Math.random() * 1000000));
    user.verifyOtp = otp;
    // Set OTP expiration time to 24 hours
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();
    // Create a Nodemailer mail option
    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Account Verification OTP",
      text: `Hello ${user.name}, \n. Your OTP is ${otp}. \n Using this OTP to verify your account.`,
    };
    // Send the OTP to the user's email address
    await transporter.sendMail(mailOption);
    res.json({ success: true, message: "Verification OTP sent on your Email" });
  } catch (error) {
    // Handle any errors that occur during OTP sending
    res.json({ success: false, message: error.message });
  }
};

/**
 * Verify a user's email address using an OTP.
 *
 * This function will check if all required fields are provided, check if the
 * user exists, check if the OTP is valid, check if the OTP has expired,
 * and update the user's account to be verified.
 *
 */
export const verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return res.json({ success: false, message: "Missing Details!!!" });
  }
  try {
    const user = await userModel.findById(userId);
    // Check if user exist
    if (!user) {
      return res.json({ success: false, message: "User not Found!!!" });
    }
    // Check if the OTP is valid
    if (user.verifyOtp === "" || user.verifyOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP!!!" });
    }
    // Check if the OTP has expired
    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP Expired" });
    }
    // Update the user's account to be verified
    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;

    await user.save();
    return res.json({ success: true, message: "Email Verified Successfully" });
  } catch (error) {
    // Handle any errors that occur during verification
    return res.json({ success: false, message: error.message });
  }
};
/**
 * Check if the user is authenticated.
 *
 * This function will return a JSON response with a success message if the
 * user is authenticated, or an error message if the user is not
 * authenticated.
 *
 */
export const isAuthenticated = async (req, res) => {
  try {
    // Return a JSON response with a success message if the user is authenticated
    return res.json({ success: true });
  } catch (error) {
    // Return an error message if the user is not authenticated
    return res.json({ success: false, message: error.message });
  }
};

/*************  ✨ Codeium Command 🌟  *************/
/**
 * Send a reset OTP to the user's email address.
 *
 * This function will check if an email address is provided, check if the
 * user exists, generate a random 6-digit OTP, set the OTP expiration time
 * to 15 minutes, and send the OTP to the user's email address using
 * Nodemailer.
 *
 *
 */
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.json({ success: false, message: "Email is Required!!!" });
  try {
    const user = await userModel.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not Found!!!" });
    // Generate a random 6-digit OTP
    const otp = String(Math.floor(Math.random() * 1000000));
    user.resetOtp = otp;
    // Set OTP expiration time to 15 minutes
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
    await user.save();
    // Create a Nodemailer mail option
    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Hello ${user.name}, \n. Your OTP for resetting your password is ${otp}. \n Using this OTP to reset your password.`,
    };
    // Send the OTP to the user's email address
    await transporter.sendMail(mailOption);
    return res.json({ success: true, message: "Reset OTP sent on your Email" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Reset the user's password using a reset OTP.
 *
 * This function will check if the required fields are provided, check if the
 * user exists, check if the OTP is valid, check if the OTP has expired, hash
 * the new password, reset the user's password, and return a JSON response with
 * a success message if the password is reset successfully.
 *
 */
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  //Check if email || otp || newPassword is missing
  if (!email || !otp || !newPassword)
    return res.json({
      success: false,
      message: "Missing Information! Email, OTP and New Password are required",
    });
  try {
    // Check if the user exists
    const user = await userModel.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not Found!!!" });
    // Check if the OTP is valid
    if (user.resetOtp === "" || user.resetOtp !== otp)
      return res.json({ success: false, message: "Invalid OTP!!!" });
    // Check if the OTP has expired
    if (user.resetOtpExpireAt < Date.now())
      return res.json({ success: false, message: "OTP Expired" });
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Reset the user's password
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    await user.save();
    // Return a JSON response with a success message
    return res.json({
      success: true,
      message: "Password Changed Successfully",
    });
  } catch (error) {
    // Handle any errors that occur during password reset
    return res.json({ success: false, message: error.message });
  }
};
