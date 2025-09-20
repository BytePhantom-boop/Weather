import { useState } from "react";
import axios from "axios";

function describeWeather(code) {
  if (code === 0) return "Clear sky";
  if ([1,2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45,48].includes(code)) return "Fog";
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return "Rain";
  if ([71,73,75,85,86].includes(code)) return "Snow";
  if ([95,96,99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function iconForCode(code) {
  if (code === 0) return "https://img.icons8.com/ios-filled/100/ffffff/sun--v1.png";
  if ([1,2].includes(code)) return "https://img.icons8.com/ios-filled/100/ffffff/partly-cloudy-day.png";
  if (code === 3) return "https://img.icons8.com/ios-filled/100/ffffff/cloud.png";
  if ([45,48].includes(code)) return "https://img.icons8.com/ios-filled/100/ffffff/fog-day.png";
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return "https://img.icons8.com/ios-filled/100/ffffff/rain.png";
  if ([71,73,75,85,86].includes(code)) return "https://img.icons8.com/ios-filled/100/ffffff/snow.png";
  if ([95,96,99].includes(code)) return "https://img.icons8.com/ios-filled/100/ffffff/storm.png";
  return "https://img.icons8.com/ios-filled/100/ffffff/thermometer.png";
}

const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export default function App() {
  const [query,setQuery] = useState("");
  const [data,setData] = useState(null);
  const [forecast,setForecast] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [recent,setRecent] = useState(JSON.parse(localStorage.getItem("weather_recent_v1")||"[]"));
  const [options,setOptions] = useState([]); 
  const [unit,setUnit] = useState("C"); // NEW (toggle state)

  // Convert temperature based on unit
  function formatTemp(temp) {
    if (unit === "C") return `${Math.round(temp)}°C`;
    return `${Math.round((temp * 9) / 5 + 32)}°F`;
  }

  async function geocode(city){
    const res = await axios.get(`${GEOCODE}?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
    if(!res.data.results||res.data.results.length===0) throw new Error("City not found");
    return res.data.results;
  }

  async function fetchWeatherByCoords(lat,lon,placeName){
    const res = await axios.get(`${FORECAST}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&windspeed_unit=kmh`);
    const weatherJson = res.data;
    const cw = weatherJson.current_weather;
    const payload = {
      place: placeName,
      temperature: cw.temperature,
      windspeed: cw.windspeed,
      weathercode: cw.weathercode,
      time: cw.time,
      description: describeWeather(cw.weathercode)
    };
    setData(payload);

    // Forecast
    const daily = weatherJson.daily;
    const forecastData = daily.time.map((t,i)=>({
      date: t,
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
      code: daily.weathercode[i]
    }));
    setForecast(forecastData);

    // Update recent
    const newRecent = [payload.place,...recent.filter(r=>r!==payload.place)].slice(0,6);
    setRecent(newRecent);
    localStorage.setItem("weather_recent_v1",JSON.stringify(newRecent));

    setOptions([]); // clear options after selection
  }

  async function handleSearch(city){
    if(!city) return;
    setLoading(true); setError("");
    try{
      const places = await geocode(city.trim());
      setOptions(places); // show multiple options
      setData(null);
      setForecast([]);
    }catch(e){
      setError(e.message||"Failed to fetch weather");
      setOptions([]);
    }finally{ setLoading(false); }
  }

  function handleRecentClick(placeName){ setQuery(placeName); handleSearch(placeName); }
  function clearRecent(){ setRecent([]); localStorage.removeItem("weather_recent_v1"); }

  return (
    <div className="bg-sky w-screen min-h-screen relative flex flex-col items-center justify-start overflow-visible">
      <div className="center-content">
        <h1>Weather App</h1>

        <form onSubmit={(e)=>{e.preventDefault(); handleSearch(query);}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter city..." />
          <button type="submit">{loading?"Searching...":"Search"}</button>
        </form>

        {/* Toggle button */}
        <button onClick={()=>setUnit(unit==="C"?"F":"C")} className="toggle-btn">
          Show in °{unit==="C"?"F":"C"}
        </button>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {/* City options */}
        {options.length>0 && (
          <div className="options-container">
            <p>Select a location:</p>
            {options.map(o=>(
              <button key={o.id}
                onClick={()=>fetchWeatherByCoords(o.latitude,o.longitude,`${o.name}, ${o.country}`)}
                className="option-btn"
              >
                {o.name}, {o.country}
              </button>
            ))}
          </div>
        )}

        {data && (
          <div className="weather-card">
            <img src={iconForCode(data.weathercode)} alt={data.description} />
            <div>{data.place}</div>
            <div>{formatTemp(data.temperature)} | {data.description}</div>
            <div>Wind: {data.windspeed} km/h</div>
          </div>
        )}

        {forecast.length>0 && (
          <div className="forecast-container">
            {forecast.map(f=>(
              <div key={f.date} className="forecast-card">
                <div>{f.date}</div>
                <img src={iconForCode(f.code)} alt="" />
                <div>Max: {formatTemp(f.max)}</div>
                <div>Min: {formatTemp(f.min)}</div>
              </div>
            ))}
          </div>
        )}

        {recent.length>0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {recent.map(r=>(
              <button key={r} onClick={()=>handleRecentClick(r)} className="recent-btn">{r}</button>
            ))}
            <button onClick={clearRecent} className="recent-btn text-red-400">Clear</button>
          </div>
        )}
      </div>
    </div>
  );
}
