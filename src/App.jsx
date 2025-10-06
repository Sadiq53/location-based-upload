import React, { useState, useEffect } from 'react';
import { Upload, MapPin, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export default function App() {
  const [lastLocation, setLastLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [canUpload, setCanUpload] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
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
          timestamp: new Date().toISOString(),
        };
        setCurrentLocation(coords);
        setLoading(false);

        // Check distance if there's a last location
        if (lastLocation) {
          const dist = calculateDistance(
            lastLocation.latitude,
            lastLocation.longitude,
            coords.latitude,
            coords.longitude
          );
          setDistance(dist);
          setCanUpload(dist >= 150);
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
      // Validate file (you can add more validations)
      const maxSize = 10 * 1024 * 1024; // 10MB
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

    // Save location to state (simulating localStorage)
    setLastLocation(currentLocation);
    setUploadCount(uploadCount + 1);
    
    // Reset for next upload
    setSelectedFile(null);
    setCurrentLocation(null);
    setDistance(null);
    setCanUpload(false);
    setError('');
    
    // Clear file input
    document.getElementById('fileInput').value = '';
  };

  // Get location on component mount and when needed
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <MapPin className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              Location-Based Document Upload
            </h1>
          </div>

          {/* Upload Count */}
          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-indigo-800">
              <span className="font-semibold">Total Uploads:</span> {uploadCount}
            </p>
          </div>

          {/* Location Status */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Current Location
              </h3>
              {loading && (
                <p className="text-sm text-gray-600">Getting location...</p>
              )}
              {locationError && (
                <p className="text-sm text-red-600">{locationError}</p>
              )}
              {currentLocation && !loading && (
                <div className="text-sm text-gray-600">
                  <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
                  <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
                </div>
              )}
            </div>

            {lastLocation && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Last Upload Location
                </h3>
                <div className="text-sm text-gray-600">
                  <p>Lat: {lastLocation.latitude.toFixed(6)}</p>
                  <p>Lng: {lastLocation.longitude.toFixed(6)}</p>
                </div>
              </div>
            )}

            {distance !== null && (
              <div
                className={`rounded-lg p-4 ${
                  canUpload ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {canUpload ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <h3
                    className={`font-semibold ${
                      canUpload ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    Distance from Last Upload
                  </h3>
                </div>
                <p
                  className={`text-sm mt-2 ${
                    canUpload ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {distance.toFixed(2)} meters
                  {!canUpload &&
                    ` (Need ${(150 - distance).toFixed(2)} more meters)`}
                </p>
              </div>
            )}
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fileInput"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Document
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors">
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {selectedFile
                          ? selectedFile.name
                          : 'Click to select a file'}
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
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Validation Note */}
            {!canUpload && lastLocation && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Upload Restricted
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      You must be at least 150 meters away from your last upload
                      location to upload another document. Please move to a
                      different location and refresh your position.
                    </p>
                  </div>
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
                {loading ? 'Getting Location...' : 'Refresh Location'}
              </button>
              <button
                onClick={handleUpload}
                disabled={!canUpload || !selectedFile || !currentLocation}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Document
              </button>
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Note:</span> This is a demo
              application. Documents are validated but not saved anywhere. Your
              location coordinates are stored in memory only during this session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}