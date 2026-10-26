import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { WeatherApp } from './components/WeatherApp';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');

  useEffect(() => {
    // Check if URL specifies app view (e.g., app.html, /app, ?view=app, or #app)
    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (
      pathname.endsWith('app.html') ||
      pathname.endsWith('/app') ||
      search.includes('view=app') ||
      hash === '#app'
    ) {
      setCurrentView('app');
    }
  }, []);

  if (currentView === 'app') {
    return <WeatherApp />;
  }

  return (
    <LandingPage
      onOpenApp={() => {
        // Direct link to standalone app page if app.html exists, or switch view
        if (window.location.pathname.endsWith('.html')) {
          window.location.href = './app.html';
        } else {
          setCurrentView('app');
        }
      }}
    />
  );
};

export default App;
