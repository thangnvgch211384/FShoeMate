const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
}

function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        const token = header.split(" ")[1];
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = payload;
        } catch (error) {
            // Invalid token, but continue without user
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };