import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedMemberDashboard = ({ onNavigate }) => {
  const [memberStats, setMemberStats] = useState(null);
  const [planAssignments, setPlanAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipExpiring, setMembershipExpiring] = useState(false);

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Fetch member stats
      try {
        const statsResponse = await axios.get(`${API}/members/me/stats`, { headers });
        setMemberStats(statsResponse.data);
        
        // Check if membership is expiring
        if (statsResponse.data.days_remaining <= 7 && statsResponse.data.days_remaining > 0) {
          setMembershipExpiring(true);
        }
      } catch (error) {
        console.log('Member stats endpoint not available, will use basic data');
      }

      // Fetch plan assignments
      const assignmentsResponse = await axios.get(`${API}/plan-assignments/my`, { headers });
      setPlanAssignments(assignmentsResponse.data);

      // Fetch announcements
      try {
        const announcementsResponse = await axios.get(`${API}/announcements/me`, { headers });
        setAnnouncements(announcementsResponse.data || []);
      } catch (error) {
        console.log('Announcements endpoint not available');
        setAnnouncements([]);
      }

      // Fetch attendance status
      const attendanceResponse = await axios.get(`${API}/attendance/my-status`, { headers });
      setAttendanceStatus(attendanceResponse.data);

    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAttendanceStatusIcon = (status) => {
    switch (status) {
      case 'not_checked_in': return '⚪';
      case 'checked_in': return '🟢';
      case 'checked_out': return '🔵';
      default: return '⚪';
    }
  };

  const dismissNotification = () => {
    setMembershipExpiring(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome Back! 👋</h1>
              <p className="text-blue-100">Ready for your workout?</p>
            </div>
            <div className="text-right">
              <div className="text-3xl">{getAttendanceStatusIcon(attendanceStatus?.status)}</div>
            </div>
          </div>
        </div>

        {/* Membership Expiry Notification */}
        {membershipExpiring && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 rounded-r-lg">
            <div className="flex items-center justify-between">
              <div className="flex">
                <div className="text-yellow-400 mr-3">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Membership expires in {memberStats?.days_remaining} days
                  </p>
                  <p className="text-xs text-yellow-700">Renew now to continue enjoying gym access</p>
                </div>
              </div>
              <button 
                onClick={dismissNotification}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="p-4 space-y-4">
          {/* Membership Status Card */}
          {memberStats && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center">
                <div className="text-4xl mb-2">💪</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Membership Status</h3>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(memberStats.membership_status)} mb-3`}>
                  {memberStats.membership_status.charAt(0).toUpperCase() + memberStats.membership_status.slice(1)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{memberStats.total_visits || 0}</div>
                    <div className="text-xs text-gray-600">Total Visits</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {memberStats.days_remaining > 0 ? memberStats.days_remaining : 0}
                    </div>
                    <div className="text-xs text-gray-600">Days Left</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's Check-in Status */}
          {attendanceStatus && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Today's Status</h3>
                <div className="text-2xl">{getAttendanceStatusIcon(attendanceStatus.status)}</div>
              </div>
              
              {attendanceStatus.status === 'not_checked_in' && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Haven't checked in today</p>
                  <button
                    onClick={() => onNavigate('checkin')}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Check In Now 📱
                  </button>
                </div>
              )}
              
              {attendanceStatus.status === 'checked_in' && (
                <div className="text-center">
                  <p className="text-green-600 font-medium mb-2">You're checked in! 🎉</p>
                  <p className="text-sm text-gray-600">
                    Since: {new Date(attendanceStatus.attendance.check_in_time).toLocaleTimeString()}
                  </p>
                </div>
              )}
              
              {attendanceStatus.status === 'checked_out' && (
                <div className="text-center">
                  <p className="text-blue-600 font-medium mb-2">Workout completed! 💯</p>
                  <p className="text-sm text-gray-600">
                    Duration: {attendanceStatus.attendance.duration_minutes} minutes
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('my-plans')}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-2xl text-center hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm font-medium">My Plans</div>
              <div className="text-xs opacity-90">{planAssignments.length} active</div>
            </button>
            
            <button
              onClick={() => onNavigate('checkin')}
              className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-2xl text-center hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105"
            >
              <div className="text-2xl mb-2">📱</div>
              <div className="text-sm font-medium">Check In</div>
              <div className="text-xs opacity-90">Scan QR</div>
            </button>
          </div>

          {/* Current Plans Preview */}
          {planAssignments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Plans</h3>
                <button
                  onClick={() => onNavigate('my-plans')}
                  className="text-blue-600 text-sm font-medium"
                >
                  View All →
                </button>
              </div>
              
              <div className="space-y-3">
                {planAssignments.slice(0, 2).map((assignment) => (
                  <div key={assignment.id} className="flex items-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl mr-3">
                      {assignment.plan_type === 'workout' ? '🏋️‍♂️' : '🥗'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{assignment.plan_name}</h4>
                      <p className="text-xs text-gray-600">
                        {assignment.plan_type.charAt(0).toUpperCase() + assignment.plan_type.slice(1)} Plan
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Announcements */}
          {announcements.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Latest News</h3>
                <button
                  onClick={() => onNavigate('announcements')}
                  className="text-blue-600 text-sm font-medium"
                >
                  View All →
                </button>
              </div>
              
              <div className="space-y-3">
                {announcements.slice(0, 2).map((announcement) => (
                  <div key={announcement.id} className="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">{announcement.title}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {planAssignments.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Start?</h3>
              <p className="text-gray-600 mb-4">Your trainer will assign workout and diet plans soon</p>
              <button
                onClick={() => onNavigate('checkin')}
                className="bg-blue-600 text-white py-2 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Check In First 📱
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation Space */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default EnhancedMemberDashboard;