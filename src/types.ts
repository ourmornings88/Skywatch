export type ScreenType = 
  | 'pinScreen' 
  | 'licenseScreen' 
  | 'pinSetupScreen' 
  | 'setupScreen' 
  | 'chatScreen' 
  | 'galleryScreen';

export interface LocationInfo {
  lat: number;
  lon: number;
  name: string;
  t?: number;
}

export interface WeatherData {
  city: string;
  temp: string;
  icon: string;
  condition: string;
  highLow: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  details: WeatherDetail[];
  rawCurrentTime?: string;
  error?: string;
}

export interface HourlyForecast {
  time: string;
  icon: string;
  temp: string;
}

export interface DailyForecast {
  day: string;
  icon: string;
  low: string;
  high: string;
  lowNum: number;
  highNum: number;
}

export interface WeatherDetail {
  label: string;
  value: string;
}

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  timestamp?: number;
  timeFormatted?: string;
}

export interface DecoyPhoto {
  id: string;
  src: string;
}

export interface StoredCodes {
  r: string; // real pin hash
  d: string; // decoy pin hash
}
