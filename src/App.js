import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import './App.css';
import logo from './logo.png';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  useEffect(() => {
    // --- DATE LOGIC ---
    const updateDates = () => {
        const now = new Date();
        
        const engDay = daysOfWeek[now.getDay()];
        const engDate = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        const nepaliDateObj = new NepaliDate(now);
        const nepDate = nepaliDateObj.format('DD MMMM YYYY');
        const nepDay = daysOfWeek[nepaliDateObj.getDay()]; 

        setDates({
            english: { day: engDay, date: engDate },
            nepali: { day: nepDay, date: nepDate }
        });
    };
    updateDates();

    // --- FETCH PRICE ---
    const fetchRates = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL 
          ? `${process.env.REACT_APP_API_URL}/api/rates`
          : 'http://localhost:5000/api/rates';
          
        const response = await axios.get(apiUrl);
        setRates(response.data);
      } catch (error) {
        console.error("Error fetching rates", error);
      }
    };
    fetchRates();
  }, []);

  return (
    <div className="app-wrapper">
      <div className="main-container">

        {/* HEADER: BIG DPPL LOGO */}
        <div className="logo-container">
          <div className="logo-circle">
            <img src={logo} className="logo-img" alt="DPPL Logo" />
          </div>
        </div>

        <h1 className="rate-title">Today's Silver Rate</h1>

        <div className="date-container">
          <div className="date-box">
            <div className="day-text">{dates.nepali.day}</div>
            <div className="date-text">{dates.nepali.date}</div>
          </div>
          <div className="date-box">
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

          <div className="grid-value highlight">{rates.tolaSale}</div>
          <div className="grid-value">{rates.tolaBuy}</div>
          <div className="grid-value highlight">{rates.gramSale}</div>
          <div className="grid-value">{rates.gramBuy}</div>
        </div>
        
        {/* FOOTER: SOURCE TEXT */}
        <div className="source-text">
          SOURCE: FENEGOSIDA & KAGOSIDA
        </div>

      </div>
    </div>
  );
}

export default App;