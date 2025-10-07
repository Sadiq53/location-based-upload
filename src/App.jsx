import React, { useState, useEffect, useRef } from 'react';
import { Upload, MapPin, AlertCircle, CheckCircle, FileText, Map, Check, X, Navigation, Image as ImageIcon, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const WORK_TYPES = ['Trenching', 'Ducting', 'Cable Pulling', 'Backfilling', 'Splicing'];

export default function App() {
  const [uploads, setUploads] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [canUpload, setCanUpload] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [workType, setWorkType] = useState('Trenching');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [viewingUpload, setViewingUpload] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routesRef = useRef([]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);

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

    const map = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
  };

  const fetchRoute = async (startLat, startLon, endLat, endLon) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates;
        return coordinates.map(coord => [coord[1], coord[0]]);
      }
      return null;
    } catch (error) {
      console.error('Error fetching route:', error);
      return null;
    }
  };

  useEffect(() => {
    const updateMap = async () => {
      if (!mapInstanceRef.current || !window.L) return;

      markersRef.current.forEach(marker => marker.remove());
      routesRef.current.forEach(route => route.remove());
      markersRef.current = [];
      routesRef.current = [];

      if (uploads.length === 0) return;

      uploads.forEach((upload, index) => {
        const markerColor = upload.status === 'approved' ? '#10b981' : '#ef4444';
        
        const customIcon = window.L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: ${markerColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${index + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = window.L.marker(
          [upload.latitude, upload.longitude],
          { icon: customIcon }
        ).addTo(mapInstanceRef.current);

        const popupContent = `
          <div style="min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
              Upload #${index + 1}
            </div>
            <div style="margin-top: 8px;">
              <div style="margin-bottom: 6px;">
                <strong style="color: #4b5563;">Work Type:</strong>
                <span style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 2px 10px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 600;
                  margin-left: 6px;
                  display: inline-block;
                ">${upload.workType}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #4b5563;">Status:</strong>
                <span style="
                  color: white;
                  background-color: ${markerColor};
                  padding: 2px 10px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 600;
                  margin-left: 6px;
                  display: inline-block;
                ">${upload.status.toUpperCase()}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #4b5563;">Images:</strong>
                <span style="color: #1f2937; margin-left: 4px;">${upload.files.length} file(s)</span>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #4b5563;">Time:</strong>
                <span style="color: #6b7280; font-size: 12px; margin-left: 4px;">${new Date(upload.timestamp).toLocaleString()}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #4b5563;">Location:</strong>
                <div style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #374151; margin-top: 2px; font-family: monospace;">
                  ${upload.latitude.toFixed(6)}, ${upload.longitude.toFixed(6)}
                </div>
              </div>
              <button 
                onclick="window.viewUploadDetails(${index})"
                style="
                  width: 100%;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  padding: 10px 16px;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 13px;
                  cursor: pointer;
                  transition: all 0.2s;
                  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                "
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(102, 126, 234, 0.4)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(102, 126, 234, 0.3)'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                View Details
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'custom-popup'
        });

        markersRef.current.push(marker);
      });

      // Make viewUploadDetails globally accessible
      window.viewUploadDetails = (index) => {
        setViewingUpload(uploads[index]);
        setCurrentImageIndex(0);
      };

      setRouteLoading(true);
      for (let i = 0; i < uploads.length - 1; i++) {
        const start = uploads[i];
        const end = uploads[i + 1];
        
        const routeCoordinates = await fetchRoute(
          start.latitude,
          start.longitude,
          end.latitude,
          end.longitude
        );

        if (routeCoordinates) {
          const lineColor = end.status === 'approved' ? '#10b981' : '#ef4444';
          
          const route = window.L.polyline(routeCoordinates, {
            color: lineColor,
            weight: 5,
            opacity: 0.8,
            dashArray: end.status === 'approved' ? null : '10, 10',
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(mapInstanceRef.current);

          routesRef.current.push(route);
        }
      }
      setRouteLoading(false);

      if (uploads.length > 0) {
        const bounds = uploads.map(u => [u.latitude, u.longitude]);
        mapInstanceRef.current.fitBounds(bounds, { 
          padding: [60, 60],
          maxZoom: 15
        });
      }
    };

    updateMap();
  }, [uploads]);

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

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.latitude, coords.longitude], 15);
        }

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
          setDistance(null);
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024;
    const validFiles = [];
    
    for (const file of files) {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Max 10MB per file.`);
        continue;
      }
      
      // Create preview URL for images
      const fileWithPreview = {
        file: file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      };
      validFiles.push(fileWithPreview);
    }
    
    setSelectedFiles(validFiles);
    setError('');
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (!currentLocation) {
      setError('Unable to get your current location');
      return;
    }

    if (!canUpload) {
      setError(`You must be at least 150 meters away from your last upload location. Current distance: ${distance?.toFixed(2)} meters`);
      return;
    }

    if (!remark.trim()) {
      setError('Please add a remark');
      return;
    }

    const newUpload = {
      id: Date.now(),
      workType: workType,
      remark: remark,
      files: selectedFiles,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      timestamp: new Date().toISOString(),
      status: 'pending',
      uploadedBy: 'User 1'
    };

    setUploads([...uploads, newUpload]);
    
    setSelectedFiles([]);
    setWorkType('Trenching');
    setRemark('');
    setCurrentLocation(null);
    setDistance(null);
    setCanUpload(false);
    setError('');
    document.getElementById('fileInput').value = '';
  };

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

  const downloadFile = (fileData) => {
    const link = document.createElement('a');
    link.href = fileData.preview;
    link.download = fileData.name;
    link.click();
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">SkyFiber</h1>
                  <p className="text-sm text-blue-100">Upload Tracker with Route Mapping</p>
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
                <div className={`rounded-lg p-4 ${canUpload ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {canUpload ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h3 className={`font-semibold ${canUpload ? 'text-green-700' : 'text-red-700'}`}>
                      Distance Validation
                    </h3>
                  </div>
                  <p className={`text-sm mt-2 font-medium ${canUpload ? 'text-green-600' : 'text-red-600'}`}>
                    {distance.toFixed(2)} meters from last upload
                  </p>
                  {!canUpload && (
                    <p className="text-xs mt-1 text-red-600">
                      ⚠️ Move {(150 - distance).toFixed(2)} more meters to upload
                    </p>
                  )}
                </div>
              )}

              {/* Work Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Type *
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {WORK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* File Upload - Multi Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images/Documents * (Multiple files allowed)
                </label>
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors">
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 text-center">
                        Click to select files
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Max 10MB per file
                      </p>
                    </div>
                  </div>
                  <input
                    id="fileInput"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                  />
                </label>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Selected Files ({selectedFiles.length})</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFiles.map((fileData, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={fileData.preview} 
                          alt={fileData.name}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <p className="text-xs text-gray-600 mt-1 truncate">{fileData.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark *
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add your remark here..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                  rows="3"
                />
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
                  disabled={!canUpload || selectedFiles.length === 0 || !currentLocation || !remark.trim()}
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
                              #{index + 1} - {upload.workType}
                            </p>
                            <p className="text-xs text-gray-500">
                              {upload.files.length} file(s) • {new Date(upload.timestamp).toLocaleString()}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Route Map
                  </h3>
                  {routeLoading && (
                    <span className="text-xs text-blue-600 animate-pulse">Loading routes...</span>
                  )}
                </div>
                <div 
                  ref={mapRef} 
                  className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-200"
                  style={{ minHeight: '400px' }}
                />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-gray-600">Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setViewingUpload(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">SkyFiber</h2>
                  <p className="text-sm text-blue-100 mt-1">{viewingUpload.workType}</p>
                </div>
                <button
                  onClick={() => setViewingUpload(null)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(90vh-88px)]">
              {/* Left Sidebar - Thumbnails */}
              <div className="bg-gray-50 p-4 border-r border-gray-200 overflow-y-auto">
                <div className="mb-4">
                  <button
                    onClick={() => setViewingUpload(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                  {viewingUpload.workType}
                </h3>

                <div className="space-y-2">
                  {viewingUpload.files.map((fileData, index) => (
                    <div
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index
                          ? 'border-indigo-500 shadow-lg'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={fileData.preview}
                        alt={fileData.name}
                        className="w-full h-20 object-cover"
                      />
                      <div className="bg-white p-2">
                        <p className="text-xs text-gray-600 truncate">{fileData.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-2 flex flex-col overflow-hidden">
                {/* Image Viewer */}
                <div className="bg-gray-900 relative flex items-center justify-center h-[60vh] md:h-[60vh] shrink-0 overflow-hidden">
                  {viewingUpload.files.length > 0 && (
                    <>
                      <img
                        src={viewingUpload.files[currentImageIndex].preview}
                        alt={viewingUpload.files[currentImageIndex].name}
                        className="max-h-full max-w-full object-contain"
                      />

                      {/* Navigation Arrows */}
                      {viewingUpload.files.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === 0 ? viewingUpload.files.length - 1 : prev - 1
                            )}
                            className="absolute left-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                          >
                            <ChevronLeft className="w-6 h-6 text-gray-800" />
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === viewingUpload.files.length - 1 ? 0 : prev + 1
                            )}
                            className="absolute right-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                          >
                            <ChevronRight className="w-6 h-6 text-gray-800" />
                          </button>
                        </>
                      )}

                      {/* Image Counter */}
                      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {viewingUpload.files.length}
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => downloadFile(viewingUpload.files[currentImageIndex])}
                        className="absolute top-4 left-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                        title="Download"
                      >
                        <Download className="w-5 h-5 text-gray-800" />
                      </button>
                    </>
                  )}
                </div>

                {/* Details Panel */}
                <div className="bg-white p-6 border-t border-gray-200 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
                      <p className="text-sm font-medium text-gray-800">
                        Lat - {viewingUpload.latitude.toFixed(4)}° N • Long - {viewingUpload.longitude.toFixed(4)}° E
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Uploaded By</p>
                      <p className="text-sm font-medium text-gray-800">{viewingUpload.uploadedBy}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Upload Date</p>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(viewingUpload.timestamp).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {new Date(viewingUpload.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        viewingUpload.status === 'approved' ? 'bg-green-100 text-green-700' :
                        viewingUpload.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {viewingUpload.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Remark</p>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {viewingUpload.remark}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  );
}