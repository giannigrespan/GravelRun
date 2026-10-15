const { getDb, getSession } = require('./_lib');

// Giorno della tappa calcolato sul server (fuso italiano) così tutti giocano la stessa tappa
function todayKey() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}

const MAX_KM = 100;

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const col = (await getDb()).collection('scores');
        // Migrazione: l'indice univoco per nome risale a prima degli account
        await col.dropIndex('date_1_name_1').catch(() => {});
        await col.createIndex({ date: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'string' } } });
        await col.createIndex({ date: 1, dist: -1 });
        const date = todayKey();

        if (req.method === 'POST') {
            const session = getSession(req);
            if (!session) return res.status(401).json({ error: 'Accedi per registrare il punteggio' });

            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const dist = Number(body.dist);
            if (!Number.isFinite(dist) || dist <= 0 || dist > MAX_KM) {
                return res.status(400).json({ error: 'Distanza non valida' });
            }
            // Un solo record per utente al giorno: si tiene il migliore
            await col.updateOne(
                { date, userId: session.uid },
                { $max: { dist: Math.round(dist * 100) / 100 }, $set: { name: session.username }, $setOnInsert: { createdAt: new Date() } },
                { upsert: true }
            );
        } else if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Metodo non consentito' });
        }

        const scores = await col
            .find({ date, userId: { $exists: true } }, { projection: { _id: 0, name: 1, dist: 1 } })
            .sort({ dist: -1 })
            .limit(10)
            .toArray();
        return res.status(200).json({ date, scores });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Errore del database' });
    }
};
