import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const CheckIn = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [todayCheckins, setTodayCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // QR Code state
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeError, setQrCodeError] = useState(null);

  useEffect(() => {
    fetchTodayCheckins();
    fetchQRCode();
    
    // Refresh QR code every 5 minutes
    const qrInterval = setInterval(fetchQRCode, 5 * 60 * 1000);
    
    return () => clearInterval(qrInterval);
  }, []);

  const fetchQRCode = async () => {
    setQrCodeLoading(true);
    setQrCodeError(null);
    try {
      const response = await axios.get(`${API}/attendance/qr-code`);
      setQrCodeData(response.data);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setQrCodeError('Failed to generate QR code');
    } finally {
      setQrCodeLoading(false);
    }
  };

  const fetchTodayCheckins = async () => {
    try {
      // Use new attendance endpoint
      const response = await axios.get(`${API}/attendance/today`);
      setTodayCheckins(response.data);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      // Fallback to old endpoint if new one fails
      try {
        const fallbackResponse = await axios.get(`${API}/checkins/today`);
        setTodayCheckins(fallbackResponse.data);
      } catch (fallbackError) {
        console.error('Error fetching check-ins (fallback):', fallbackError);
      }
    }
  };

  const searchMembers = async (query) => {
    if (!query.trim()) {
      setMembers([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`${API}/members/search/${encodeURIComponent(query)}`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error searching members:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchMembers(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleCheckIn = async (memberId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/checkin`, { member_id: memberId });
      
      // Refresh data
      fetchTodayCheckins();
      setSearchQuery('');
      setMembers([]);
      setSelectedMember(null);
      
      alert('Member checked in successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to check in member');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMembershipStatus = (member) => {
    const endDate = new Date(member.end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'bg-red-100 text-red-800', text: 'Expired' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', color: 'bg-yellow-100 text-yellow-800', text: `${daysUntilExpiry} days left` };
    } else {
      return { status: 'active', color: 'bg-green-100 text-green-800', text: 'Active' };
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Member Check-in</h1>
        <p className="text-gray-600">Search and check-in members or use QR code for attendance</p>
      </div>

      {/* QR Code Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Attendance QR Code</h2>
          <button
            onClick={fetchQRCode}
            disabled={qrCodeLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {qrCodeLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {qrCodeError ? (
          <div className="text-center py-8">
            <div className="text-red-400 text-4xl mb-2">⚠️</div>
            <p className="text-red-600 mb-4">{qrCodeError}</p>
            <button
              onClick={fetchQRCode}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : qrCodeLoading && !qrCodeData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating QR code...</p>
          </div>
        ) : qrCodeData ? (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-4">
              <img 
                src={`data:image/png;base64,${qrCodeData.qr_code_image}`}
                alt="Attendance QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Instructions:</strong> Members can scan this QR code with their mobile app to mark attendance</p>
              <p><strong>Expires:</strong> {new Date(qrCodeData.expires_at).toLocaleTimeString()}</p>
              <p className="text-xs text-gray-500">QR code refreshes automatically every 5 minutes for security</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Member</h2>
        
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or phone number..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {searching && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {members.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            {members.map((member) => {
              const membershipInfo = getMembershipStatus(member);
              const isAlreadyCheckedIn = todayCheckins.some(c => c.member_id === member.id && !c.check_out_time);
              
              return (
                <div
                  key={member.id}
                  className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          <p className="text-sm text-gray-600">{member.phone}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${membershipInfo.color}`}>
                          {membershipInfo.text}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      {isAlreadyCheckedIn ? (
                        <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                          Already Checked In
                        </span>
                      ) : membershipInfo.status === 'expired' ? (
                        <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                          Membership Expired
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(member.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Checking In...' : 'Check In'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {searchQuery && members.length === 0 && !searching && (
          <div className="mt-4 text-center py-4 text-gray-500">
            No members found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Today's Check-ins */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Check-ins</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {todayCheckins.length} check-ins
          </span>
        </div>

        {todayCheckins.length > 0 ? (
          <div className="space-y-3">
            {todayCheckins.map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    checkin.check_out_time ? 'bg-gray-400' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <h3 className="font-medium text-gray-900">{checkin.member_name}</h3>
                    <p className="text-sm text-gray-600">
                      Check-in: {formatTime(checkin.check_in_time)}
                      {checkin.check_out_time && (
                        <span> • Check-out: {formatTime(checkin.check_out_time)}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {checkin.check_out_time ? (
                    <span className="text-sm text-gray-500">
                      Duration: {checkin.duration_minutes} min
                    </span>
                  ) : (
                    <span className="text-sm text-green-600 font-medium">
                      Currently in gym
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📅</div>
            <p className="text-gray-500">No check-ins today</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIn;
