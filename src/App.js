import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import logo from './logo.png';
import fenegosidaLogo from './fenogosida.png';
import kagosidaLogo from './kagosida.png'; // IMPORT NEW RIGHT LOGO

function App() {
  const [dates, setDates] = useState({
    english: { day: '', date: '' },
    nepali: { day: '', date: '' }
  });

  const [rates, setRates] = useState({
    tolaSale: 'Loading...',
    tolaBuy: 'Loading...',
    gramSale: 'Loading...',
    gramBuy: 'Loading...'
  });

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    // --- DATE LOGIC ---
    const updateDates = () => {
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const nepalOffset = 5.75 * 60 * 60 * 1000;
        const nepalTime = new Date(utcTime + nepalOffset);

        const engDay = daysOfWeek[nepalTime.getDay()];
        const engDate = nepalTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        
        // Placeholder for Nepali Date (Use library if needed)
        const nepDay = daysOfWeek[nepalTime.getDay()]; 
        const nepDate = "21 Poush 2082"; 

        setDates({
            english: { day: engDay, date: engDate },
            nepali: { day: nepDay, date: nepDate }
        });
    };
    updateDates();

    // --- FETCH PRICE ---
    const fetchRates = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/rates');
        setRates(response.data);
      } catch (error) {
        console.error("Error fetching rates", error);
      }
    };
    fetchRates();
  }, []);

  return (
    <div className="app-container">
      
      {/* HEADER: 3 LOGOS ROW */}
      <div className="logos-row">
        
        {/* LEFT: Fenegosida */}
        <div className="side-logo-wrapper">
          <img src={fenegosidaLogo} className="side-logo-img" alt="Fenegosida" />
        </div>

        {/* CENTER: Main DPPL Logo */}
        <div className="logo-circle">
          <img src={logo} className="logo-img" alt="DPPL Logo" />
        </div>

        {/* RIGHT: Kagosida */}
        <div className="side-logo-wrapper">
          <img src={kagosidaLogo} className="side-logo-img" alt="Kagosida" />
        </div>

      </div>

      <h1 className="rate-title">Today's Silver Rate</h1>

      <div className="date-container">
        <div className="date-box left-box">
          <div className="day-text">{dates.nepali.day}</div>
          <div className="date-text">{dates.nepali.date}</div>
        </div>
        <div className="date-box right-box">
          <div className="day-text">{dates.english.day}</div>
          <div className="date-text">{dates.english.date}</div>
        </div>
      </div>

      <div className="rate-grid">
        <div className="grid-header-main span-2">1 TOLA</div>
        <div className="grid-header-main span-2">10 GRAMS</div>

        <div className="grid-header-sub">SALE</div>
        <div className="grid-header-sub">PURCHASE</div>
        <div className="grid-header-sub">SALE</div>
        <div className="grid-header-sub">PURCHASE</div>

        <div className="grid-value">{rates.tolaSale}</div>
        <div className="grid-value">{rates.tolaBuy}</div>
        <div className="grid-value">{rates.gramSale}</div>
        <div className="grid-value">{rates.gramBuy}</div>
      </div>
    </div>
  );
}

export default App;