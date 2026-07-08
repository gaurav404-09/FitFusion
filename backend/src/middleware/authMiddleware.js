const jwt = require('jsonwebtoken');
const User = require('../models/User');
const jwksClient = require('jwks-rsa');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const client = jwksClient({
                jwksUri: process.env.SUPABASE_JWKS_URL,
                cache: true,
                cacheMaxEntries: 5,
                cacheMaxAge: 10 * 60 * 60 * 1000, // 10h in ms
            });
            function getKey(header, callback) {
                client.getSigningKey(header.kid, function(err, key) {
                    // Supabase uses ECC keys; the public key is in the x5c certificate chain
                    const signingKey = key.getPublicKey ? key.getPublicKey() : (key.publicKey || key.rsaPublicKey || key.x5c?.[0]);
                    callback(null, signingKey);
                });
            }
            jwt.verify(token, getKey, {
                algorithms: ['RS256', 'ES256'],
            }, async (err, decoded) => {
                if (err || !decoded?.sub) {
                    return res.status(401).json({ message: 'Not authorized, token failed or missing sub' });
                }
                const userId = decoded.sub;
                let user = null;
                try {
                    user = await User.findById(userId).select('-passwordHash');
                } catch (e) {
                    user = null;
                }
                req.user = user || { id: userId, _id: userId };
                return next();
            });
            return;
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
