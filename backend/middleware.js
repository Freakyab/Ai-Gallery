const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Get the token from the request header

  try {
    const authHeader = req.header("authorization");
    const token = authHeader && authHeader.split(" ")[1];

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add the user id to the request object
      req.userId = decoded.id;

      // Call the next middleware
      next();
    } catch (err) {
      res.status(401).json({ status: false, message: "Token is not valid" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

module.exports = authMiddleware;
