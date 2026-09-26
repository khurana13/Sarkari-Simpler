/**
 * SARKARI SIMPLER - Authentication & Security Module (auth.js)
 * Implements password hashing, token management, and Role-Based Access Control (RBAC).
 */

const crypto = require('crypto');
const db = require('./db');

const SECRET_KEY = process.env.JWT_SECRET || 'sarkari-simpler-secure-key-2026-v1';

/**
 * Hash password securely using PBKDF2
 */
function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * Verify password against stored hash
 */
function verifyPassword(password, hashStr) {
    return new Promise((resolve) => {
        if (!hashStr || !hashStr.includes(':')) return resolve(false);
        const [salt, key] = hashStr.split(':');
        crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
            if (err) return resolve(false);
            resolve(key === derivedKey.toString('hex'));
        });
    });
}

/**
 * Generate lightweight secure token
 */
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    const jsonStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(jsonStr).digest('hex');
    const token = Buffer.from(jsonStr).toString('base64') + '.' + signature;
    return token;
}

/**
 * Verify token and return user payload
 */
function verifyToken(tokenStr) {
    if (!tokenStr || !tokenStr.includes('.')) return null;
    try {
        const [base64Payload, signature] = tokenStr.split('.');
        const jsonStr = Buffer.from(base64Payload, 'base64').toString('utf8');
        const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(jsonStr).digest('hex');

        if (signature !== expectedSig) return null;

        const payload = JSON.parse(jsonStr);
        if (payload.exp && Date.now() > payload.exp) return null;

        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Extract auth user from Request Authorization header
 */
function getAuthUser(req) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7).trim();
    return verifyToken(token);
}

/**
 * Check if request user has admin privileges
 */
function isAdmin(req) {
    const user = getAuthUser(req);
    return user && user.role === 'admin';
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    getAuthUser,
    isAdmin
};
