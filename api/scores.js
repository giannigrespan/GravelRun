const { ObjectId, getDb, getSession } = require('./_lib');
const LEVELS = require('../levels.js');

const MAX_TIME_MS = 10 * 60 * 1000;

// Tempo minimo fisicamente possibile: percorrere tutto il livello alla velocità massima (60 tick/s)
function minTimeMs(level) {
    const l = LEVELS[level - 1];
    return Math.floor((l.goal / (l.speedMax * 0.4)) / 60 * 1000 * 0.95);
}

function parseLevel(v) {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n : null;
}

let indexesReady;
function ensureIndexes(col) {
    if (!indexesReady) {
        indexesReady = (async () => {
            // Migrazione: indici delle versioni precedenti (classifica giornaliera)
            for (const name of ['date_1_name_1', 'date_1_userId_1', 'date_1_dist_-1']) {
                await col.dropIndex(name).catch(() => {});
            }
            await col.createIndex({ level: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'string' } } });
            await col.createIndex({ level: 1, time: 1 });
        })().catch(e => { indexesReady = null; throw e; });
    }
    return indexesReady;
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const db = await getDb();
        const col = db.collection('scores');
        await ensureIndexes(col);

        let unlocked;
        const body = req.method === 'POST'
            ? (typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}))
            : {};
        if (req.method === 'POST') {
            const session = getSession(req);
            if (!session) return res.status(401).json({ error: 'Accedi per registrare il tempo' });

            const level = parseLevel(body.level);
            const time = Math.round(Number(body.time));
            if (!level) return res.status(400).json({ error: 'Livello non valido' });

            const users = db.collection('users');
            const user = await users.findOne({ _id: new ObjectId(session.uid) });
            if (!user) return res.status(401).json({ error: 'Utente non trovato' });
            if (level > (user.unlocked || 1)) return res.status(403).json({ error: 'Livello non ancora sbloccato' });
            if (!Number.isFinite(time) || time < minTimeMs(level) || time > MAX_TIME_MS) {
                return res.status(400).json({ error: 'Tempo non valido' });
            }

            // Un solo record per utente e livello: si tiene il tempo migliore
            await col.updateOne(
                { level, userId: session.uid },
                { $min: { time }, $set: { name: session.username }, $setOnInsert: { createdAt: new Date() } },
                { upsert: true }
            );
            unlocked = Math.max(user.unlocked || 1, Math.min(LEVELS.length, level + 1));
            await users.updateOne({ _id: user._id }, { $max: { unlocked } });
        } else if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Metodo non consentito' });
        }

        const level = parseLevel(req.method === 'POST' ? body.level : req.query && req.query.level) || 1;
        const scores = await col
            .find({ level, userId: { $exists: true } }, { projection: { _id: 0, name: 1, time: 1 } })
            .sort({ time: 1 })
            .limit(10)
            .toArray();
        return res.status(200).json({ level, scores, unlocked });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Errore del database' });
    }
};
