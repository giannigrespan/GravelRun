const { MongoClient } = require('mongodb');

let clientPromise;
function getCollection() {
    if (!clientPromise) {
        clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
    }
    return clientPromise.then(c => c.db('gravelrun').collection('scores'));
}

// Giorno della tappa calcolato sul server (fuso italiano) così tutti giocano la stessa tappa
function todayKey() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}

const MAX_KM = 100;

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const col = await getCollection();
        await col.createIndex({ date: 1, name: 1 }, { unique: true });
        await col.createIndex({ date: 1, dist: -1 });
        const date = todayKey();

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const name = String(body.name || '').trim().replace(/[<>&"']/g, '').slice(0, 12) || 'Rider_1';
            const dist = Number(body.dist);
            if (!Number.isFinite(dist) || dist <= 0 || dist > MAX_KM) {
                return res.status(400).json({ error: 'Distanza non valida' });
            }
            const rounded = Math.round(dist * 100) / 100;
            // Un solo record per nome al giorno: si tiene il migliore
            await col.updateOne(
                { date, name },
                { $max: { dist: rounded }, $setOnInsert: { createdAt: new Date() } },
                { upsert: true }
            );
        } else if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Metodo non consentito' });
        }

        const scores = await col
            .find({ date }, { projection: { _id: 0, name: 1, dist: 1 } })
            .sort({ dist: -1 })
            .limit(10)
            .toArray();
        return res.status(200).json({ date, scores });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Errore del database' });
    }
};
