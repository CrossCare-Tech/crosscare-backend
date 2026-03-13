import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ message: "Authorization token required" });
    }

    try {
        // Verify the token and attach decoded data to the request object
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Attach userId to the request object for access in the controller
        req.userId = decoded.userId;
        next(); // Pass control to the next middleware or controller
    } catch (error) {
        console.error("Token verification error", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

export default authenticateToken;
