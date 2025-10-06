import React, { useState, useEffect, useRef } from 'react';
import { Upload, MapPin, AlertCircle, CheckCircle, FileText, Map, Check, X } from 'lucide-react';

export default function App() {
  const [uploads, setUploads] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [canUpload, setCanUpload] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const linesRef = useRef([]);

  // Initialize Leaflet map
  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    script.onload = () => {
      initializeMap();
    };
    document.body.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  const initializeMap = () => {
    if (!window.L || !mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on India (default)
    const map = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    // Add OpenStreetMap tiles (FREE - No API key required)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
  };

  // Update map with markers and lines
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing markers and lines
    markersRef.current.forEach(marker => marker.remove());
    linesRef.current.forEach(line => line.remove());
    markersRef.current = [];
    linesRef.current = [];

    if (uploads.length === 0) return;

    // Add markers for each upload
    uploads.forEach((upload, index) => {
      const markerColor = upload.status === 'approved' ? 'green' : 'red';
      
      const customIcon = window.L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${markerColor};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${index + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = window.L.marker(
        [upload.latitude, upload.longitude],
        { icon: customIcon }
      ).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong>Upload #${index + 1}</strong><br/>
          <strong>File:</strong> ${upload.fileName}<br/>
          <strong>Status:</strong> <span style="color: ${markerColor};">${upload.status.toUpperCase()}</span><br/>
          <strong>Time:</strong> ${new Date(upload.timestamp).toLocaleString()}<br/>
          <strong>Coordinates:</strong><br/>
          ${upload.latitude.toFixed(6)}, ${upload.longitude.toFixed(6)}
        </div>
      `);

      markersRef.current.push(marker);
    });

    // Draw lines between consecutive uploads
    for (let i = 0; i < uploads.length - 1; i++) {
      const start = uploads[i];
      const end = uploads[i + 1];
      
      const lineColor = end.status === 'approved' ? '#10b981' : '#ef4444';
      
      const line = window.L.polyline(
        [
          [start.latitude, start.longitude],
          [end.latitude, end.longitude]
        ],
        {
          color: lineColor,
          weight: 4,
          opacity: 0.7,
          dashArray: end.status === 'approved' ? null : '10, 10'
        }
      ).addTo(mapInstanceRef.current);

      linesRef.current.push(line);
    }

    // Fit map bounds to show all markers
    if (uploads.length > 0) {
      const bounds = uploads.map(u => [u.latitude, u.longitude]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [uploads]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(coords);
        setLoading(false);

        // Center map on current location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.latitude, coords.longitude], 15);
        }

        // Check distance if there are previous uploads
        if (uploads.length > 0) {
          const lastUpload = uploads[uploads.length - 1];
          const dist = calculateDistance(
            lastUpload.latitude,
            lastUpload.longitude,
            coords.latitude,
            coords.longitude
          );
          setDistance(dist);
          setCanUpload(dist >= 150);
        } else {
          setCanUpload(true);
        }
      },
      (err) => {
        setLocationError(`Location error: ${err.message}`);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (!currentLocation) {
      setError('Unable to get your current location');
      return;
    }

    if (!canUpload) {
      setError('You must be at least 150 meters away from your last upload location');
      return;
    }

    const newUpload = {
      id: Date.now(),
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    setUploads([...uploads, newUpload]);
    
    setSelectedFile(null);
    setCurrentLocation(null);
    setDistance(null);
    setCanUpload(false);
    setError('');
    document.getElementById('fileInput').value = '';
  };

  // Admin functions
  const approveUpload = (id) => {
    setUploads(uploads.map(upload => 
      upload.id === id ? { ...upload, status: 'approved' } : upload
    ));
  };

  const rejectUpload = (id) => {
    setUploads(uploads.map(upload => 
      upload.id === id ? { ...upload, status: 'rejected' } : upload
    ));
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Map className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Location Upload Tracker</h1>
                  <p className="text-sm text-blue-100">Track uploads with real-time mapping</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {showAdminPanel ? 'Hide' : 'Show'} Admin Panel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Panel - Upload Form */}
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{uploads.length}</p>
                  <p className="text-xs text-blue-700">Total Uploads</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {uploads.filter(u => u.status === 'approved').length}
                  </p>
                  <p className="text-xs text-green-700">Approved</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {uploads.filter(u => u.status === 'pending').length}
                  </p>
                  <p className="text-xs text-amber-700">Pending</p>
                </div>
              </div>

              {/* Current Location */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Current Location
                </h3>
                {loading && <p className="text-sm text-gray-600">Getting location...</p>}
                {locationError && <p className="text-sm text-red-600">{locationError}</p>}
                {currentLocation && !loading && (
                  <div className="text-sm text-gray-600">
                    <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
                    <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
                  </div>
                )}
              </div>

              {/* Distance Check */}
              {distance !== null && (
                <div className={`rounded-lg p-4 ${canUpload ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    {canUpload ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h3 className={`font-semibold ${canUpload ? 'text-green-700' : 'text-red-700'}`}>
                      Distance Check
                    </h3>
                  </div>
                  <p className={`text-sm mt-2 ${canUpload ? 'text-green-600' : 'text-red-600'}`}>
                    {distance.toFixed(2)} meters from last upload
                    {!canUpload && ` (Need ${(150 - distance).toFixed(2)} more meters)`}
                  </p>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Document
                </label>
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors">
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Click to select a file'}
                      </p>
                      {selectedFile && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <input
                    id="fileInput"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  {loading ? 'Getting...' : 'Refresh Location'}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!canUpload || !selectedFile || !currentLocation}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload
                </button>
              </div>

              {/* Admin Panel */}
              {showAdminPanel && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Admin Panel
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {uploads.length === 0 ? (
                      <p className="text-sm text-gray-500">No uploads yet</p>
                    ) : (
                      uploads.map((upload, index) => (
                        <div key={upload.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">
                              #{index + 1} - {upload.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(upload.timestamp).toLocaleString()}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              upload.status === 'approved' ? 'bg-green-100 text-green-700' :
                              upload.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {upload.status.toUpperCase()}
                            </span>
                          </div>
                          {upload.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveUpload(upload.id)}
                                className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => rejectUpload(upload.id)}
                                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Map */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Upload Location Map
                </h3>
                <div 
                  ref={mapRef} 
                  className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-200"
                  style={{ minHeight: '400px' }}
                />
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                    <span className="text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    <span className="text-gray-600">Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-red-500"></div>
                    <span className="text-gray-600">Pending Route</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-green-500"></div>
                    <span className="text-gray-600">Completed Route</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>Map Features:</strong> Red markers = pending approval, Green markers = approved work. 
                  Lines connect consecutive uploads. Dashed red = pending, Solid green = approved route.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}