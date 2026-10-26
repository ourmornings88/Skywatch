import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { WeatherApp } from './components/WeatherApp';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');

  return (
    <div>
      {currentView === 'landing' ? (
        <LandingPage onOpenApp={() => setCurrentView('app')} />
      ) : (
        <WeatherApp onBackToLanding={() => setCurrentView('landing')} />
      )}
    </div>
  );
};

export default App;
