import React, { useState, useEffect } from 'react';
import { fetchWeatherData } from '../services/weather';
import { WeatherData } from '../types';
import { useStealthTriggers } from '../hooks/useStealthTriggers';
import { Overlay } from './Overlay';

export const WeatherApp: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);

  const { handleTempClick, iconHoldProps, weatherAreaProps } = useStealthTriggers({
    onTrigger: () => setIsOverlayOpen(true),
    onHide: () => setIsOverlayOpen(false),
    isOverlayOpen
  });

  useEffect(() => {
    let isMounted = true;
    fetchWeatherData()
      .then(data => {
        if (isMounted) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const minLow = weather ? Math.min(...weather.daily.map(d => d.lowNum)) : 0;
  const maxHigh = weather ? Math.max(...weather.daily.map(d => d.highNum)) : 100;
  const tempRange = maxHigh - minLow || 1;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0d1520' }}>
      <div id="wxBg" />

      <div id="app">
        <div id="weather" {...weatherAreaProps}>
          {loading ? (
            <div className="wx-top" style={{ paddingTop: '60px' }}>
              <div className="wx-city">Sullivan</div>
              <div className="wx-icon-el">🌤️</div>
              <div className="wx-temp" style={{ fontSize: '88px' }}>
                76°
              </div>
              <div className="wx-cond">Mostly Sunny</div>
            </div>
          ) : weather ? (
            <>
              <div className="wx-top">
                <div className="wx-city" id="wxCity">
                  {weather.city}
                </div>
                <div
                  className="wx-icon-el"
                  id="wxIconEl"
                  {...iconHoldProps}
                >
                  {weather.icon}
                </div>
                <div
                  className="wx-temp"
                  id="wxTemp"
                  onClick={handleTempClick}
                >
                  {weather.temp}
                </div>
                <div className="wx-cond" id="wxCond">
                  {weather.condition}
                </div>
                <div className="wx-hilo" id="wxHilo">
                  {weather.highLow}
                </div>
              </div>

              {/* Hourly Forecast */}
              <div className="wc">
                <h4>Hourly Forecast</h4>
                <div className="hrs" id="wxHrs">
                  {weather.hourly.map((hr, idx) => (
                    <div key={idx} className="hr">
                      <small>{hr.time}</small>
                      <span style={{ fontSize: '24px' }}>{hr.icon}</span>
                      <span>{hr.temp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10-Day Forecast */}
              <div className="wc">
                <h4>10-Day Forecast</h4>
                <div id="wxDays">
                  {weather.daily.map((dy, k) => {
                    const leftPct = ((dy.lowNum - minLow) / tempRange) * 100;
                    const rightPct = 100 - ((dy.highNum - minLow) / tempRange) * 100;
                    return (
                      <div key={k} className="dy">
                        <span className="d">{dy.day}</span>
                        <span className="i">{dy.icon}</span>
                        <span className="l">{dy.low}</span>
                        <div className="bar">
                          <i style={{ left: `${leftPct}%`, right: `${rightPct}%` }} />
                        </div>
                        <span className="h">{dy.high}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid" id="wxGrid">
                {weather.details.map((g, idx) => (
                  <div key={idx} className="wc">
                    <h4>{g.label}</h4>
                    <b>{g.value}</b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="wx-err">Unable to load weather forecast data.</div>
          )}
        </div>
      </div>

      {/* Secret Encrypted Overlay */}
      <Overlay isOpen={isOverlayOpen} onClose={() => setIsOverlayOpen(false)} />
    </div>
  );
};
