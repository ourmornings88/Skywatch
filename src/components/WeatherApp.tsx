import React, { useState, useEffect } from 'react';
import { fetchWeatherData } from '../services/weather';
import { WeatherData } from '../types';
import { useStealthTriggers } from '../hooks/useStealthTriggers';
import { Overlay } from './Overlay';

interface WeatherAppProps {
  onBackToLanding?: () => void;
}

export const WeatherApp: React.FC<WeatherAppProps> = ({ onBackToLanding }) => {
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

      {/* Optional Top Nav Bar for App Shell */}
      {onBackToLanding && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: 'rgba(7, 12, 24, 0.85)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(91,164,207,0.18)',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px'
          }}
        >
          <button
            onClick={onBackToLanding}
            style={{
              background: 'none',
              border: 'none',
              color: '#5BA4CF',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ← SkyWatch Website
          </button>
          <button
            onClick={() => setIsOverlayOpen(true)}
            style={{
              background: 'rgba(91,164,207,0.15)',
              border: '1px solid rgba(91,164,207,0.3)',
              color: '#EDF2FA',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🔒 Stealth Mode
          </button>
        </div>
      )}

      <div id="app">
        <div id="weather" {...weatherAreaProps}>
          {loading ? (
            <div className="wx-top" style={{ paddingTop: '60px' }}>
              <div className="wx-city">Loading Weather…</div>
              <div className="wx-temp" style={{ fontSize: '48px', marginTop: '20px' }}>
                --°
              </div>
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
                  title="Hold for 2s or tap 5x on temperature to unlock"
                >
                  {weather.icon}
                </div>
                <div
                  className="wx-temp"
                  id="wxTemp"
                  onClick={handleTempClick}
                  title="Tap 5 times quickly"
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
