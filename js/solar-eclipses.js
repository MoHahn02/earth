// Curated solar-eclipse geometry for the globe overlay.
// Central-path coordinates are WGS 84 samples from the NASA/GSFC path table.

const minute = 60 * 1000;

export const SOLAR_ECLIPSES = [
    {
        id: '2026-08-12-total',
        type: 'total',
        partialStartMs: Date.UTC(2026, 7, 12, 15, 34, 15),
        centralStartMs: Date.UTC(2026, 7, 12, 17, 2, 0),
        greatestMs: Date.UTC(2026, 7, 12, 17, 45, 54),
        centralEndMs: Date.UTC(2026, 7, 12, 18, 34, 0),
        partialEndMs: Date.UTC(2026, 7, 12, 19, 57, 39),
        maximumDurationSeconds: 138.2,
        greatest: { lat: 65.225, lon: -25.2283 },
        visibilityCenter: { lat: 61, lon: -22 },
        visibilityRadiusDeg: 72,
        regions: {
            de: 'Total in Grönland, Island und Nordspanien; partiell in weiten Teilen Europas, Nordafrikas und Nordamerikas.',
            en: 'Total in Greenland, Iceland, and northern Spain; partial across much of Europe, North Africa, and North America.'
        },
        sourceUrl: 'https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2026Aug12Tpath.html',
        sourceLabel: 'Eclipse Predictions by Fred Espenak, NASA\'s GSFC',
        path: [
            { time: '17:02', north: [75.9367, 108.7583], south: [85.3217, 119.4233], center: [82.2750, 112.4867] },
            { time: '17:06', north: [84.8500, 90.3950], south: [89.0667, 38.1483], center: [87.2783, 81.5250] },
            { time: '17:10', north: [86.5450, 32.7283], south: [86.1417, -29.2167], center: [86.8350, -1.6383] },
            { time: '17:14', north: [84.4817, -4.8100], south: [83.0717, -33.4167], center: [83.9317, -21.1867] },
            { time: '17:18', north: [81.7750, -16.2167], south: [80.2917, -33.8967], center: [81.1100, -25.9917] },
            { time: '17:22', north: [79.1417, -20.5383], south: [77.7267, -33.5050], center: [78.4833, -27.5400] },
            { time: '17:26', north: [76.6417, -22.3933], south: [75.3233, -32.8050], center: [76.0183, -27.9283] },
            { time: '17:30', north: [74.2667, -23.1450], south: [73.0433, -31.9717], center: [73.6833, -27.7883] },
            { time: '17:34', north: [71.9917, -23.3133], south: [70.8600, -31.0683], center: [71.4500, -27.3617] },
            { time: '17:38', north: [69.7983, -23.1317], south: [68.7533, -30.1200], center: [69.2983, -26.7600] },
            { time: '17:42', north: [67.6700, -22.7133], south: [66.7067, -29.1333], center: [67.2100, -26.0317] },
            { time: '17:46', north: [65.5933, -22.1200], south: [64.7100, -28.1067], center: [65.1717, -25.2050] },
            { time: '17:50', north: [63.5567, -21.3817], south: [62.7500, -27.0333], center: [63.1717, -24.2867] },
            { time: '17:54', north: [61.5467, -20.5083], south: [60.8167, -25.9050], center: [61.2000, -23.2767] },
            { time: '17:58', north: [59.5533, -19.5000], south: [58.9000, -24.7067], center: [59.2450, -22.1700] },
            { time: '18:02', north: [57.5650, -18.3483], south: [56.9900, -23.4217], center: [57.2967, -20.9467] },
            { time: '18:06', north: [55.5683, -17.0283], south: [55.0783, -22.0250], center: [55.3433, -19.5883] },
            { time: '18:10', north: [53.5467, -15.5033], south: [53.1517, -20.4850], center: [53.3717, -18.0567] },
            { time: '18:14', north: [51.4783, -13.7117], south: [51.1933, -18.7550], center: [51.3600, -16.3033] },
            { time: '18:18', north: [49.3300, -11.5467], south: [49.1817, -16.7650], center: [49.2850, -14.2383] },
            { time: '18:22', north: [47.0383, -8.8017], south: [47.0833, -14.3967], center: [47.1017, -11.7150] },
            { time: '18:26', north: [44.4567, -4.9483], south: [44.8317, -11.4200], center: [44.7133, -8.3983] },
            { time: '18:30', north: [40.6650, 3.2950], south: [42.2633, -7.2367], center: [41.8167, -3.1850] },
            { time: 'limit', north: [39.7083, 6.3400], south: [37.6900, 4.5400], center: [38.6800, 5.4150] }
        ]
    }
];

export function nextSolarEclipse(afterMs = Date.now()) {
    const timestamp = Number(afterMs);
    if (!Number.isFinite(timestamp)) return null;
    return SOLAR_ECLIPSES.find((eclipse) => eclipse.partialEndMs >= timestamp) || null;
}

export function eclipseCountdownDays(eclipse, fromMs = Date.now()) {
    if (!eclipse || !Number.isFinite(fromMs)) return null;
    return Math.max(0, Math.ceil((eclipse.greatestMs - fromMs) / (24 * 60 * minute)));
}
