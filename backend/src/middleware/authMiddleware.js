import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, "secretkey");

      const user = await User.findById(decoded.id).select("-password");

      req.user = user;

      next();
    } catch (error) {
      return res.status(401).json({
        message: "Not Authorized"
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "No Token"
    });
  }
};