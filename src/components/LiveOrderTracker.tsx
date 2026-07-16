'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Compass, ShieldCheck, Clock, Phone, Info } from 'lucide-react';

interface DeliveryPartnerProps {
  name: string;
  phone: string;
  vehicle: string;
  lat?: number;
  lng?: number;
  destLat?: number;
  destLng?: number;
  eta?: string;
}

export default function LiveOrderTracker({ partner }: { partner: DeliveryPartnerProps }) {
  const startLat = 14.6186; // Chiyyedu Farm
  const startLng = 77.6358;
  const destLat = partner.destLat || 14.6819; // Anantapur Town
  const destLng = partner.destLng || 77.6006;

  const [currentLat, setCurrentLat] = useState(partner.lat || startLat);
  const [currentLng, setCurrentLng] = useState(partner.lng || startLng);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [etaVal, setEtaVal] = useState(15); // in minutes

  // Simulate movement in real-time
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (partner.eta === 'Delivered') {
      if (progress !== 100) setProgress(100);
      if (currentLat !== destLat) setCurrentLat(destLat);
      if (currentLng !== destLng) setCurrentLng(destLng);
      if (etaVal !== 0) setEtaVal(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(interval);
          setEtaVal(0);
          return 100;
        }

        // Interpolate coordinates
        const ratio = next / 100;
        const currentLatitude = startLat + (destLat - startLat) * ratio;
        const currentLongitude = startLng + (destLng - startLng) * ratio;
        setCurrentLat(Number(currentLatitude.toFixed(6)));
        setCurrentLng(Number(currentLongitude.toFixed(6)));

        // Countdown ETA
        const remainingMinutes = Math.max(1, Math.round(15 * (1 - ratio)));
        setEtaVal(remainingMinutes);

        return next;
      });
    }, 2000); // update every 2 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destLat, destLng, partner.eta]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden font-sans text-white">
      
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />
      
      {/* Tracker Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center animate-pulse">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">Live Delivery Tracking</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Telemetry Active</p>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
          <Clock className="h-3.5 w-3.5 animate-pulse" />
          <span className="text-xs font-black">
            {etaVal > 0 ? `${etaVal} mins ETA` : 'Arrived'}
          </span>
        </div>
      </div>

      {/* SVG Map Visualization */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 h-48 relative flex items-center justify-center overflow-hidden">
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-5 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="border-t border-l border-white" />
          ))}
        </div>

        {/* Dynamic Route SVG */}
        <svg className="w-full h-full absolute inset-0 p-8" viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main Road Path */}
          <path
            d="M 20 80 C 100 20, 150 100, 200 40 C 250 -20, 320 100, 380 40"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Travel Trail */}
          <path
            d="M 20 80 C 100 20, 150 100, 200 40 C 250 -20, 320 100, 380 40"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="400"
            strokeDashoffset={400 - (progress / 100) * 400}
            className="transition-all duration-1000 ease-out"
          />
          
          {/* Origin Marker (Chiyyedu Farm) */}
          <g transform="translate(15, 65)">
            <circle cx="5" cy="5" r="10" fill="#10b981" fillOpacity="0.2"/>
            <circle cx="5" cy="5" r="4" fill="#10b981"/>
          </g>

          {/* Destination Marker (Customer address) */}
          <g transform="translate(375, 25)">
            <circle cx="5" cy="5" r="10" fill="#3b82f6" fillOpacity="0.2"/>
            <circle cx="5" cy="5" r="4" fill="#3b82f6"/>
          </g>
        </svg>

        {/* Live coordinates display (Telemetry overlays) */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] text-slate-400 font-mono font-bold shadow-md">
          <Compass className="h-3 w-3 text-slate-500 animate-spin" />
          <span>GPS: {currentLat}, {currentLng}</span>
        </div>

        {/* Farm & Home Indicators */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 tracking-wider">
          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
          Chiyyedu Farm
        </div>

        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-400 tracking-wider">
          <span className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
          Your Home
        </div>

        {/* Simulated delivery partner avatar sliding along the path */}
        <div 
          className="absolute h-9 w-9 bg-emerald-500 border border-emerald-400 text-white rounded-xl shadow-lg flex items-center justify-center transition-all duration-1000 ease-out"
          style={{
            left: `calc(10% + ${progress * 0.76}%)`,
            top: `${50 - Math.sin((progress / 100) * Math.PI * 3) * 20}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          🛵
        </div>
      </div>

      {/* Delivery Partner Telemetry Card */}
      <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 border border-slate-800/80 rounded-2xl">
        <div className="space-y-1 border-r border-slate-800/60 pr-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Partner</p>
          <p className="text-sm font-black text-white truncate">{partner.name}</p>
          <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <Phone className="h-2.5 w-2.5" /> {partner.phone}
          </p>
        </div>

        <div className="space-y-1 pl-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vehicle Details</p>
          <p className="text-sm font-black text-white truncate">{partner.vehicle}</p>
          <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Contactless Enabled
          </p>
        </div>
      </div>

      {/* Deep Link Google Maps Action Button */}
      <button 
        onClick={handleOpenGoogleMaps}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-bold transition-all text-slate-200 hover:text-white shadow-lg"
      >
        <MapPin className="h-4 w-4 text-emerald-400" />
        <span>Open Route in Google Maps</span>
      </button>

      {/* Info Notice */}
      <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed">
        <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>For safety, our delivery partner will call you once they reach your landmark. Live telemetry update is refreshed every 2 seconds.</span>
      </div>

    </div>
  );
}
