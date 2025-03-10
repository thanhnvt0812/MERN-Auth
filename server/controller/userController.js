import userModel from "../models/userModel.js";

/**
 * Get the user data.
 *
 * This function will check if the user ID is provided in the request body,
 * retrieve the user document from the database using the provided ID,
 * and return the user data in a JSON response.
 *
 */
export const getUserData = async (req, res) => {
  try {
    // Get the user ID from the request body
    const { userId } = req.body;

    // Retrieve the user document from the database using the provided ID
    const user = await userModel.findById(userId);

    // Check if the user was found
    if (!user) {
      return res.json({ success: false, message: "User not Found!!!" });
    }

    // Return the user data in a JSON response
    res.json({
      success: true,
      userData: {
        name: user.name,
        isAccountVerified: user.isAccountVerified,
      },
    });
  } catch (error) {
    // Handle any errors that occur during password reset
    return res.json({ success: false, message: error.message });
  }
};
