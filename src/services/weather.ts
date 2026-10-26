import { LocationInfo, WeatherData, HourlyForecast, DailyForecast, WeatherDetail } from '../types';

const WEATHER_CODES: Array<[number[], string, string, string]> = [
  [[0], '☀️', '🌙', 'Clear'],
  [[1], '🌤️', '🌙', 'Mostly Clear'],
  [[2], '⛅', '☁️', 'Partly Cloudy'],
  [[3], '☁️', '☁️', 'Overcast'],
  [[45, 48], '🌫️', '🌫️', 'Fog'],
  [[51, 53, 55, 56, 57], '🌦️', '🌧️', 'Drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', '🌧️', 'Rain'],
  [[71, 73, 75, 77, 85, 86], '🌨️', '🌨️', 'Snow'],
  [[95, 96, 99], '⛈️', '⛈️', 'Thunderstorms']
];

function getWxInfo(code: number, isDay: boolean | number): [string, string] {
  const isDayBool = Boolean(isDay);
  const match = WEATHER_CODES.find(x => x[0].includes(code)) || WEATHER_CODES[2];
  return [isDayBool ? match[1] : match[2], match[3]];
}

function formatTemp(n: number): string {
  return Math.round(n) + '°';
}

function formatHr12(timeStr: string): string {
  const hour = parseInt(timeStr.slice(11, 13), 10);
  return (hour % 12 || 12) + (hour < 12 ? ' AM' : ' PM');
}

function formatTime(timeStr: string): string {
  const hour = parseInt(timeStr.slice(11, 13), 10);
  return (hour % 12 || 12) + ':' + timeStr.slice(14, 16) + (hour < 12 ? ' AM' : ' PM');
}

export async function getLocation(): Promise<LocationInfo> {
  try {
    const cached = JSON.parse(localStorage.getItem('_sw_loc') || 'null');
    if (cached && Date.now() - cached.t < 86400000) {
      return cached;
    }
  } catch {}

  const pos = await new Promise<GeolocationCoordinates | null>(resolve => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => resolve(p.coords),
        () => resolve(null),
        { timeout: 8000 }
      );
    } else {
      resolve(null);
    }
  });

  let location: LocationInfo;

  if (pos) {
    let name = 'My Location';
    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.latitude}&longitude=${pos.longitude}&localityLanguage=en`
      );
      const geoData = await geoRes.json();
      name = geoData.city || geoData.locality || name;
    } catch {}
    location = { lat: pos.latitude, lon: pos.longitude, name, t: Date.now() };
  } else {
    // Default fallback: Sullivan
    try {
      const geoRes = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Sullivan&count=1');
      const geoData = await geoRes.json();
      if (geoData.results?.[0]) {
        const g = geoData.results[0];
        location = { lat: g.latitude, lon: g.longitude, name: g.name, t: Date.now() };
      } else {
        location = { lat: 39.0953, lon: -87.4089, name: 'Sullivan', t: Date.now() };
      }
    } catch {
      location = { lat: 39.0953, lon: -87.4089, name: 'Sullivan', t: Date.now() };
    }
  }

  try {
    localStorage.setItem('_sw_loc', JSON.stringify(location));
  } catch {}

  return location;
}

export async function fetchWeatherData(): Promise<WeatherData> {
  const loc = await getLocation();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,weather_code,is_day,uv_index,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=10`;

  const res = await fetch(url);
  const data = await res.json();

  const c = data.current;
  const h = data.hourly;
  const d = data.daily;

  const [currentIcon, conditionText] = getWxInfo(c.weather_code, c.is_day);

  // Hourly
  const nowHourStr = c.time.slice(0, 13);
  let startIdx = h.time.findIndex((t: string) => t.slice(0, 13) >= nowHourStr);
  if (startIdx < 0) startIdx = 0;

  const hourly: HourlyForecast[] = h.time.slice(startIdx, startIdx + 24).map((t: string, idx: number) => {
    const j = startIdx + idx;
    const [icon] = getWxInfo(h.weather_code[j], h.is_day[j]);
    return {
      time: idx === 0 ? 'Now' : formatHr12(t),
      icon,
      temp: formatTemp(idx === 0 ? c.temperature_2m : h.temperature_2m[j])
    };
  });

  // Daily
  const daily: DailyForecast[] = d.time.map((t: string, k: number) => {
    const lo = d.temperature_2m_min[k];
    const hi = d.temperature_2m_max[k];
    const [icon] = getWxInfo(d.weather_code[k], 1);
    const dateObj = new Date(t + 'T12:00');
    const dayLabel = k === 0 ? 'Today' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });

    return {
      day: dayLabel,
      icon,
      low: formatTemp(lo),
      high: formatTemp(hi),
      lowNum: lo,
      highNum: hi
    };
  });

  // Details grid
  const currentVisibilityMiles = Math.min(10, Math.round((h.visibility[startIdx] || 16093) / 1609));
  const currentPressureInHg = (c.surface_pressure * 0.02953).toFixed(2);

  const details: WeatherDetail[] = [
    { label: 'Feels Like', value: formatTemp(c.apparent_temperature) },
    { label: 'Humidity', value: Math.round(c.relative_humidity_2m) + '%' },
    { label: 'Wind', value: Math.round(c.wind_speed_10m) + ' mph' },
    { label: 'UV Index', value: String(Math.round(h.uv_index[startIdx] || 0)) },
    { label: 'Sunrise', value: formatTime(d.sunrise[0]) },
    { label: 'Sunset', value: formatTime(d.sunset[0]) },
    { label: 'Pressure', value: currentPressureInHg + ' inHg' },
    { label: 'Visibility', value: currentVisibilityMiles + ' mi' }
  ];

  return {
    city: loc.name,
    temp: formatTemp(c.temperature_2m),
    icon: currentIcon,
    condition: conditionText,
    highLow: `H:${formatTemp(d.temperature_2m_max[0])}  L:${formatTemp(d.temperature_2m_min[0])}`,
    hourly,
    daily,
    details,
    rawCurrentTime: c.time
  };
}
