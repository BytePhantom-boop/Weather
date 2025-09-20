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
  const [forecast,setForecast] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [recent,setRecent] = useState(JSON.parse(localStorage.getItem("weather_recent_v1")||"[]"));
  const [unit,setUnit] = useState("C"); // Celsius/Fahrenheit

  function displayTemp(temp){
    return unit === "C" ? `${Math.round(temp)}°C` : `${Math.round((temp*9/5)+32)}°F`;
  }

  async function geocode(city){
    const res = await axios.get(`${GEOCODE}?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
    if(!res.data.results||res.data.results.length===0) throw new Error("City not found");
    return res.data.results[0];
  }

  async function fetchWeatherByCoords(lat,lon){
    const res = await axios.get(`${FORECAST}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&windspeed_unit=kmh`);
    return res.data;
  }

  async function handleSearch(city){
    if(!city) return;
    setLoading(true); setError("");
    try{
      const place = await geocode(city.trim());
      const weatherJson = await fetchWeatherByCoords(place.latitude, place.longitude);
      const cw = weatherJson.current_weather;
      let humidity=null;
      if(weatherJson.hourly?.time){
        const idx = weatherJson.hourly.time.indexOf(cw.time);
        humidity = idx!==-1? weatherJson.hourly.relativehumidity_2m[idx]:null;
      }
      setData({
        place: `${place.name}, ${place.country}`,
        temperature: cw.temperature,
        windspeed: cw.windspeed,
        weathercode: cw.weathercode,
        time: cw.time,
        humidity,
        description: describeWeather(cw.weathercode)
      });
      setForecast({
        max: weatherJson.daily.temperature_2m_max,
        min: weatherJson.daily.temperature_2m_min,
        codes: weatherJson.daily.weathercode,
        dates: weatherJson.daily.time
      });
      const newRecent = [place.name,...recent.filter(r=>r!==place.name)].slice(0,6);
      setRecent(newRecent);
      localStorage.setItem("weather_recent_v1",JSON.stringify(newRecent));
      setQuery("");
    }catch(e){
      setError(e.message||"Failed to fetch weather");
    }finally{ setLoading(false); }
  }

  function handleRecentClick(placeName){ setQuery(placeName); handleSearch(placeName); }
  function clearRecent(){ setRecent([]); localStorage.removeItem("weather_recent_v1"); }

  return (
    <div className="bg-sky w-screen h-screen relative flex items-center justify-center overflow-hidden">

      {/* Clouds */}
      <div className="cloud" style={{ top:"10%", width:"200px", animationDuration:"60s"}}></div>
      <div className="cloud" style={{ top:"20%", width:"250px", animationDuration:"80s"}}></div>
      <div className="cloud" style={{ top:"30%", width:"180px", animationDuration:"100s"}}></div>

      <div className="center-content">
        <h1>Weather App</h1>

        <form onSubmit={(e)=>{e.preventDefault(); handleSearch(query);}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter city..." />
          <button type="submit">{loading?"Searching...":"Search"}</button>
        </form>

        <button className="unit-toggle" onClick={()=>setUnit(unit==="C"?"F":"C")}>
          {unit==="C"?"Switch to °F":"Switch to °C"}
        </button>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {data && (
          <div className="weather-card">
            <img src={iconForCode(data.weathercode)} alt={data.description} />
            <div>{data.place}</div>
            <div>{displayTemp(data.temperature)} | {data.description}</div>
            <div>Humidity: {data.humidity ?? "-"}% | Wind: {data.windspeed} km/h</div>
          </div>
        )}

        {forecast && (
          <div className="forecast-container">
            {forecast.dates.map((d,i)=>(
              <div key={i} className="forecast-card">
                <div>{d}</div>
                <img src={iconForCode(forecast.codes[i])} alt={describeWeather(forecast.codes[i])} />
                <div>{displayTemp(forecast.max[i])} / {displayTemp(forecast.min[i])}</div>
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
