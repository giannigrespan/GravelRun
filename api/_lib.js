const crypto = require('crypto');
const { MongoClient } = require('mongodb');

let clientPromise;
function getDb() {
    if (!clientPromise) {
        clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
    }
    return clientPromise.then(c => c.db('gravelrun'));
}

const COOKIE = 'gr_session';
const SESSION_DAYS = 30;

function secret() {
    if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET mancante');
    return process.env.AUTH_SECRET;
}

function sign(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    return `${body}.${mac}`;
}

function verify(token) {
    if (!token || !token.includes('.')) return null;
    const [body, mac] = token.split('.');
    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    const a = Buffer.from(mac), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        return payload.exp > Date.now() ? payload : null;
    } catch {
        return null;
    }
}

function getSession(req) {
    const cookies = String(req.headers.cookie || '').split(';').map(c => c.trim());
    const hit = cookies.find(c => c.startsWith(COOKIE + '='));
    return hit ? verify(hit.slice(COOKIE.length + 1)) : null;
}

function setSession(res, user) {
    const exp = Date.now() + SESSION_DAYS * 864e5;
    const token = sign({ uid: String(user._id), username: user.username, exp });
    res.setHeader('Set-Cookie',
        `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
}

function clearSession(res) {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

function checkPassword(password, salt, hash) {
    const a = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'));
    const b = Buffer.from(hash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { getDb, getSession, setSession, clearSession, hashPassword, checkPassword };
