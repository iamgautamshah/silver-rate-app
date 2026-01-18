const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const DB_FILE = path.join(__dirname, 'database.json');

let cachedData = {
    tola: "0",
    gram10: "0",
    source: "Initializing...",
    updatedAt: new Date().toISOString()
};

if (fs.existsSync(DB_FILE)) {
    try {
        cachedData = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) { console.error("Error reading DB file:", e); }
}

const saveToCache = (data) => {
    cachedData = { ...data, updatedAt: new Date().toISOString() };
    fs.writeFileSync(DB_FILE, JSON.stringify(cachedData, null, 2));
    console.log(`✅ Cache Updated: Tola=${cachedData.tola}, 10g=${cachedData.gram10}`);
};

async function fetchFenegosida() {
    try {
        console.log("Attempting to fetch Fenegosida...");
        const response = await axios.get('https://www.fenegosida.org/', {
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(response.data);
        const text = $('body').text();

        // --- FIX 1: UPDATED REGEX ---
        // Added '.' inside [\d,.] to capture decimals like 4231.50
        const tolaMatch = text.match(/Silver\s*per\s*1\s*Tola.*?([\d,.]+)/i);
        const gramMatch = text.match(/Silver\s*per\s*10\s*Grm.*?([\d,.]+)/i);

        let tola = tolaMatch ? parseFloat(tolaMatch[1].replace(/,/g, '')) : 0;
        let gram10 = gramMatch ? parseFloat(gramMatch[1].replace(/,/g, '')) : 0;

        // Conversion fallback
        if (!tola && gram10) tola = gram10 * 1.16638;
        if (!gram10 && tola) gram10 = tola / 1.16638;

        if (tola && gram10) {
            return { 
                // --- FIX 2: REMOVED toFixed(0) ---
                // We keep decimals so 4231.5 stays 4231.5
                tola: tola, 
                gram10: gram10,
                source: "Live: FENEGOSIDA"
            };
        }

        return null;
    } catch (err) {
        console.warn("Fetch failed:", err.message);
        return null;
    }
}

// --- BACKGROUND LOOP ---
let isRetryActive = false;

async function startScrapingLoop() {
    console.log("Starting Background Scraper Loop...");
    await runCycle();
    setInterval(async () => {
        if (!isRetryActive) await runCycle();
    }, 5 * 60 * 1000); 
}

async function runCycle() {
    const success = await attemptFetch();
    if (!success && !isRetryActive) {
        isRetryActive = true;
        console.log("⚠️ Entering Retry Mode...");
        const retryInterval = setInterval(async () => {
            console.log("Retrying...");
            const retrySuccess = await attemptFetch();
            if (retrySuccess) {
                console.log("✅ Retry Successful!");
                clearInterval(retryInterval);
                isRetryActive = false;
            }
        }, 10000);
    }
}

async function attemptFetch() {
    const data = await fetchFenegosida();
    if (data) {
        saveToCache(data);
        return true;
    }
    return false;
}

startScrapingLoop();

// --- API ROUTE ---
app.get('/api/rates', (req, res) => {
    // Ensure we parse as float to preserve decimals
    const tolaSale = parseFloat(cachedData.tola);
    const gramSale = parseFloat(cachedData.gram10);
    
    const tolaBuy = tolaSale ? tolaSale - 100 : 0;
    const gramBuy = gramSale ? gramSale - 85 : 0;

    // Send raw numbers or formatted strings with decimals allowed
    res.json({
        tolaSale: `Rs. ${tolaSale.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        tolaBuy: `Rs. ${tolaBuy.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        gramSale: `Rs. ${gramSale.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        gramBuy: `Rs. ${gramBuy.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        source: cachedData.source,
        lastUpdated: cachedData.updatedAt
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend Server running on http://localhost:${PORT}`));