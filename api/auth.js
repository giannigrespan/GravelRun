const { getDb, getSession, setSession, clearSession, hashPassword, checkPassword } = require('./_lib');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;
const DUMMY = hashPassword('dummy-password');

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (req.method === 'GET') {
            const s = getSession(req);
            return res.status(200).json({ user: s ? { username: s.username } : null });
        }
        if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const action = body.action;

        if (action === 'logout') {
            clearSession(res);
            return res.status(200).json({ user: null });
        }

        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (!EMAIL_RE.test(email) || email.length > 254) {
            return res.status(400).json({ error: 'Email non valida' });
        }

        const db = await getDb();
        const users = db.collection('users');
        await users.createIndex({ email: 1 }, { unique: true });
        await users.createIndex({ username: 1 }, { unique: true });

        if (action === 'register') {
            const username = String(body.username || '').trim();
            if (!USERNAME_RE.test(username)) {
                return res.status(400).json({ error: 'Nome: 3-12 caratteri (lettere, numeri, _)' });
            }
            if (password.length < 8 || password.length > 128) {
                return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
            }
            const { salt, hash } = hashPassword(password);
            try {
                const r = await users.insertOne({ email, username, salt, hash, createdAt: new Date() });
                setSession(res, { _id: r.insertedId, username });
                return res.status(201).json({ user: { username } });
            } catch (e) {
                if (e.code === 11000) {
                    const field = e.message.includes('username') ? 'Nome ciclista' : 'Email';
                    return res.status(409).json({ error: `${field} già in uso` });
                }
                throw e;
            }
        }

        if (action === 'login') {
            const user = await users.findOne({ email });
            // Esegue comunque il confronto per non rivelare se l'email esiste
            const ok = checkPassword(password, (user || DUMMY).salt, (user || DUMMY).hash);
            if (!user || !ok) return res.status(401).json({ error: 'Email o password errati' });
            setSession(res, user);
            return res.status(200).json({ user: { username: user.username } });
        }

        return res.status(400).json({ error: 'Azione non valida' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Errore del server' });
    }
};
