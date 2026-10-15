// Dati dei livelli, condivisi da client (index.html) e server (api/)
(function (root) {
    const LEVELS = [
        { name: 'Sterrato di Prova',  goal: 9000,  amp: 0.08, freq: 1.0, gap: 520, puddle: 0.40, halfW: 0.30, speed0: 16, speedMax: 26, theme: { grass: ['#3a4a28', '#40522c'], road: [140, 115, 85] } },
        { name: 'Colline Dolci',      goal: 12000, amp: 0.11, freq: 1.0, gap: 440, puddle: 0.35, halfW: 0.29, speed0: 16, speedMax: 27, theme: { grass: ['#3f5a2a', '#46632f'], road: [146, 120, 88] } },
        { name: 'Strada Bianca',      goal: 15000, amp: 0.13, freq: 1.1, gap: 380, puddle: 0.30, halfW: 0.28, speed0: 17, speedMax: 28, theme: { grass: ['#6b7a3a', '#73833f'], road: [185, 170, 140] } },
        { name: 'Bosco Fitto',        goal: 18000, amp: 0.15, freq: 1.2, gap: 330, puddle: 0.30, halfW: 0.27, speed0: 17, speedMax: 29, theme: { grass: ['#26401f', '#2b4824'], road: [110, 88, 62] } },
        { name: 'Greto del Fiume',    goal: 21000, amp: 0.17, freq: 1.3, gap: 290, puddle: 0.25, halfW: 0.26, speed0: 18, speedMax: 30, theme: { grass: ['#5a6a3c', '#617343'], road: [160, 150, 135] } },
        { name: 'Cresta Ventosa',     goal: 24000, amp: 0.19, freq: 1.4, gap: 250, puddle: 0.25, halfW: 0.25, speed0: 18, speedMax: 31, theme: { grass: ['#7a6a3a', '#85743f'], road: [150, 125, 90] } },
        { name: 'Cava Abbandonata',   goal: 27000, amp: 0.21, freq: 1.5, gap: 215, puddle: 0.20, halfW: 0.24, speed0: 19, speedMax: 33, theme: { grass: ['#4a4a40', '#52524a'], road: [135, 128, 118] } },
        { name: 'Passo Alpino',       goal: 30000, amp: 0.23, freq: 1.6, gap: 185, puddle: 0.20, halfW: 0.23, speed0: 19, speedMax: 34, theme: { grass: ['#556655', '#5c6e5c'], road: [128, 122, 115] } },
        { name: 'Tempesta di Fango',  goal: 33000, amp: 0.25, freq: 1.7, gap: 155, puddle: 0.15, halfW: 0.22, speed0: 20, speedMax: 36, theme: { grass: ['#33402a', '#394830'], road: [105, 82, 58] } },
        { name: 'Gran Finale',        goal: 38000, amp: 0.27, freq: 1.8, gap: 130, puddle: 0.15, halfW: 0.21, speed0: 21, speedMax: 38, theme: { grass: ['#3a4a28', '#40522c'], road: [140, 115, 85] } }
    ];
    LEVELS.forEach((l, i) => { l.seed = 1000 + i * 37; });
    if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
    else root.LEVELS = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
