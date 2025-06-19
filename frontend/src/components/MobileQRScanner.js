import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const MobileQRScanner = ({ onNavigate }) => {
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAttendanceStatus();
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const response = await axios.get(`${API}/attendance/my-status`, { headers });
      setAttendanceStatus(response.data);
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrData) => {
    setScanning(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const response = await axios.post(`${API}/attendance/mark`, {
        qr_code_data: qrData,
        device_info: navigator.userAgent
      }, { headers });

      // Refresh attendance status
      await fetchAttendanceStatus();
      
      // Show success message
      const isCheckIn = !attendanceStatus?.attendance?.check_out_time;
      alert(isCheckIn ? 'Successfully checked in! 🎉' : 'Successfully checked out! 👋');
      
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to mark attendance. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleQRScan(manualCode.trim());
      setManualCode('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you'd use a QR code library to decode the image
      // For now, we'll show an instruction to use manual entry
      alert('Please use the manual code entry below or scan with camera');
    }
  };

  const openCamera = () => {
    // In a real app, you'd integrate with a QR scanner library like react-qr-scanner
    alert('Camera QR scanner would open here. For demo, please use manual entry.');
  };

  const getStatusDisplay = () => {
    if (!attendanceStatus) return null;

    switch (attendanceStatus.status) {
      case 'not_checked_in':
        return {
          icon: '📱',
          title: 'Ready to Check In',
          message: 'Scan the QR code at your gym to mark your attendance',
          color: 'bg-blue-50 border-blue-200 text-blue-800'
        };
      case 'checked_in':
        return {
          icon: '✅',
          title: 'You\'re Checked In!',
          message: `Since: ${new Date(attendanceStatus.attendance.check_in_time).toLocaleTimeString()}`,
          color: 'bg-green-50 border-green-200 text-green-800'
        };
      case 'checked_out':
        return {
          icon: '👋',
          title: 'Workout Completed',
          message: `Duration: ${attendanceStatus.attendance.duration_minutes} minutes`,
          color: 'bg-purple-50 border-purple-200 text-purple-800'
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
          <div className="text-center">
            <div className="text-4xl mb-2">📱</div>
            <h1 className="text-2xl font-bold mb-2">QR Scanner</h1>
            <p className="text-blue-100">Mark your gym attendance</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          {statusDisplay && (
            <div className={`p-4 rounded-2xl border-2 ${statusDisplay.color}`}>
              <div className="text-center">
                <div className="text-3xl mb-2">{statusDisplay.icon}</div>
                <h3 className="font-semibold mb-1">{statusDisplay.title}</h3>
                <p className="text-sm">{statusDisplay.message}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-2xl">
              <div className="text-center">
                <div className="text-2xl mb-2">⚠️</div>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Scanner Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Choose Scanning Method</h3>
            
            {/* Camera Scanner */}
            <button
              onClick={openCamera}
              disabled={scanning}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📷</div>
                <div className="font-semibold">Open Camera Scanner</div>
                <div className="text-sm text-blue-100">Recommended for quick scanning</div>
              </div>
            </button>

            {/* File Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-2xl hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🖼️</div>
                <div className="font-semibold">Upload QR Image</div>
                <div className="text-sm text-green-100">Scan from gallery or screenshot</div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Manual Entry */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">⌨️</div>
                <h4 className="font-semibold text-gray-900">Manual Code Entry</h4>
                <p className="text-sm text-gray-600">Enter the QR code manually if scanning fails</p>
              </div>
              
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR code (e.g., GYMBLE_ATTENDANCE:...)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={scanning || !manualCode.trim()}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {scanning ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    'Submit Code'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl">
            <div className="text-center">
              <div className="text-2xl mb-2">💡</div>
              <h4 className="font-semibold text-yellow-800 mb-2">How to Use</h4>
              <ul className="text-sm text-yellow-700 text-left space-y-1">
                <li>• Find the QR code display at your gym entrance</li>
                <li>• Use camera scanner or upload QR image</li>
                <li>• Scan to check-in when arriving</li>
                <li>• Scan again to check-out when leaving</li>
              </ul>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              🏠 Dashboard
            </button>
            <button
              onClick={() => onNavigate('my-plans')}
              className="bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              📋 My Plans
            </button>
          </div>
        </div>

        {/* Bottom Navigation Space */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default MobileQRScanner;