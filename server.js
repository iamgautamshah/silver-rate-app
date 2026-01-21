const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

//Path to your database file
const DB_FILE = path.join(__dirname, 'database.json');

// --- ⚙️ SETTINGS: UPDATE PURCHASE RULES HERE ⚙️ ---
// Change this value to match the new Nepal Silver Rule.
// Current Rule: Deduct 4% from the Market Rate.
const DEDUCTION_PERCENTAGE = 0.04; // 4% = 0.04

// ---------------------------------------------------------

let cachedData = {
    tola: "0",
    gram10: "0",
    source: "Initializing...",
    updatedAt: new Date().toISOString()
};

// Load existing data on startup
if (fs.existsSync(DB_FILE)) {
    try {
        cachedData = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) { console.error("Error reading DB file:", e); }
}

const saveToCache = (data) => {
    cachedData = { ...data, updatedAt: new Date().toISOString() };
    fs.writeFileSync(DB_FILE, JSON.stringify(cachedData, null, 2));
    console.log(`✅ Cache Updated: Sale Tola=${cachedData.tola}`);
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

        // Regex to capture price including decimals (e.g., 4,231.50)
        const tolaMatch = text.match(/Silver\s*per\s*1\s*Tola.*?([\d,.]+)/i);
        const gramMatch = text.match(/Silver\s*per\s*10\s*Grm.*?([\d,.]+)/i);

        let tola = tolaMatch ? parseFloat(tolaMatch[1].replace(/,/g, '')) : 0;
        let gram10 = gramMatch ? parseFloat(gramMatch[1].replace(/,/g, '')) : 0;

        // Fallback Calculation if one is missing
        if (!tola && gram10) tola = gram10 * 1.16638;
        if (!gram10 && tola) gram10 = tola / 1.16638;

        if (tola && gram10) {
            return { 
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

// --- BACKGROUND SCRAPER LOOP ---
let isRetryActive = false;

async function startScrapingLoop() {
    console.log("Starting Background Scraper Loop...");
    await runCycle();
    // Check every 5 minutes
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
    // 1. Get Sale Price (Market Rate)
    const tolaSale = parseFloat(cachedData.tola);
    const gramSale = parseFloat(cachedData.gram10);
    
    // 2. Calculate Purchase Price using the PERCENTAGE rule
    // Formula: Sale Price - (Sale Price * 0.04)
    const tolaBuy = tolaSale ? (tolaSale - (tolaSale * DEDUCTION_PERCENTAGE)) : 0;
    const gramBuy = gramSale ? (gramSale - (gramSale * DEDUCTION_PERCENTAGE)) : 0;

    res.json({
        tolaSale: `Rs. ${tolaSale.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        tolaBuy: `Rs. ${tolaBuy.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        gramSale: `Rs. ${gramSale.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        gramBuy: `Rs. ${gramBuy.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`,
        source: cachedData.source,
        lastUpdated: cachedData.updatedAt
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));