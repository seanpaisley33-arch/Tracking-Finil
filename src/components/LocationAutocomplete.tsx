'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

export interface LocationData {
  display_name: string;
  lat: number;
  lon: number;
}

interface LocationAutocompleteProps {
  onSelect: (location: LocationData) => void;
  defaultValue?: string;
}

export default function LocationAutocomplete({ onSelect, defaultValue = '' }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search
  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        // Fetch US cities from Nominatim API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=5`
        );
        const data = await response.json();
        const mappedData: LocationData[] = data.map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }));
        setResults(mappedData);
        setIsOpen(mappedData.length > 0);
      } catch (error) {
        console.error('Error fetching location data:', error);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (loc: LocationData) => {
    // Format the name nicely (just the city, state)
    const parts = loc.display_name.split(', ');
    const shortName = parts.length >= 3 ? `${parts[0]}, ${parts[1]}` : loc.display_name;
    
    setQuery(shortName);
    setIsOpen(false);
    
    // Pass the selected location up
    onSelect({
      display_name: shortName,
      lat: loc.lat,
      lon: loc.lon
    });
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a US city (e.g. Chicago)..."
          className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          onClick={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
          <ul className="max-h-60 overflow-y-auto">
            {results.map((loc, idx) => (
              <li
                key={idx}
                onClick={() => handleSelect(loc)}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start space-x-3 transition-colors border-b border-slate-100 last:border-0"
              >
                <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900 line-clamp-1">{loc.display_name}</span>
                  <span className="text-xs text-slate-500">
                    {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
