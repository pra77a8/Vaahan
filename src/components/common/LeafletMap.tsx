import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Stop, LiveLocation } from '../../types';

interface LeafletMapProps {
  stops: { stop: Stop; sequenceNumber: number; isPickupEligible?: boolean; isStudentPickup?: boolean }[];
  currentLocation?: LiveLocation | null;
  busNumber?: string;
  speedKmh?: number;
  height?: string;
  zoom?: number;
  interactive?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  stops = [],
  currentLocation,
  busNumber = 'Bus',
  speedKmh = 0,
  height = '420px',
  zoom = 13,
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = stops.length > 0
        ? [stops[0].stop.latitude, stops[0].stop.longitude]
        : [20.0258, 73.8268]; // KK Wagh Engineering College default

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      stopsLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Force layout update after container renders
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Update stops and polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !stopsLayerRef.current) return;

    stopsLayerRef.current.clearLayers();

    if (stops.length === 0) return;

    const latLngs: [number, number][] = [];

    stops.forEach((item, index) => {
      const { stop, sequenceNumber, isStudentPickup } = item;
      const latLng: [number, number] = [stop.latitude, stop.longitude];
      latLngs.push(latLng);

      const isCampus = stop.name.toLowerCase().includes('k k wagh');
      const isOrigin = index === 0;
      const isDestination = index === stops.length - 1;

      // Custom styled HTML marker icon
      let iconHtml = '';
      if (isStudentPickup) {
        iconHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-amber-400 opacity-75 animate-ping"></span>
            <div class="relative w-8 h-8 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md border-2 border-white" title="Your Boarding Stop">
              ★
            </div>
          </div>
        `;
      } else if (isCampus) {
        iconHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-7 h-7 rounded-full bg-emerald-400 opacity-50 animate-ping"></span>
            <div class="relative w-7 h-7 rounded-full bg-emerald-700 text-white font-extrabold text-[10px] flex items-center justify-center shadow-md border-2 border-white" title="College Terminal">
              KKW
            </div>
          </div>
        `;
      } else if (isOrigin) {
        iconHtml = `
          <div class="relative w-7 h-7 rounded-full bg-slate-900 text-amber-300 font-extrabold text-[10px] flex items-center justify-center shadow-md border-2 border-amber-400" title="Route Origin Terminal">
            #1
          </div>
        `;
      } else if (isDestination) {
        iconHtml = `
          <div class="relative w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shadow-md border-2 border-white" title="Route End Terminal">
            END
          </div>
        `;
      } else {
        iconHtml = `
          <div class="relative w-6 h-6 rounded-full bg-white text-slate-800 font-bold text-[10px] flex items-center justify-center shadow-xs border-2 border-sky-600">
            ${sequenceNumber}
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-stop-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <p style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${stop.name}</p>
          <p style="color: #64748b; margin: 0 0 4px 0; font-size: 11px;">Stop #${sequenceNumber}${stop.landmark ? ` · ${stop.landmark}` : ''}</p>
          ${isStudentPickup ? '<span style="display:inline-block; font-size:10px; font-weight:700; color:#b45309; background:#fef3c7; padding:2px 6px; border-radius:4px;">★ Your Pickup Point</span>' : ''}
        </div>
      `;

      const marker = L.marker(latLng, { icon: customIcon }).bindPopup(popupContent);
      stopsLayerRef.current?.addLayer(marker);
    });

    // Draw route polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    if (latLngs.length > 1) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#0284c7',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 6',
      }).addTo(map);

      // Fit bounds to show entire route with padding
      map.fitBounds(L.latLngBounds(latLngs), { padding: [35, 35] });
    }
  }, [stops]);

  // Update bus location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!currentLocation) {
      if (busMarkerRef.current) {
        busMarkerRef.current.remove();
        busMarkerRef.current = null;
      }
      return;
    }

    const busPos: [number, number] = [currentLocation.latitude, currentLocation.longitude];

    const busIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-10 h-10 rounded-full bg-sky-500 opacity-60 animate-ping"></span>
        <div class="relative w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        </div>
      </div>
    `;

    const busIcon = L.divIcon({
      html: busIconHtml,
      className: 'custom-bus-live-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker(busPos, { icon: busIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`<strong>${busNumber}</strong><br/>Live Speed: ${speedKmh} km/h`);
    } else {
      busMarkerRef.current.setLatLng(busPos);
      busMarkerRef.current.setPopupContent(`<strong>${busNumber}</strong><br/>Live Speed: ${speedKmh} km/h`);
    }
  }, [currentLocation, busNumber, speedKmh]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-10"
    />
  );
};
