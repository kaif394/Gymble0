import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    today_checkins: 0,
    current_checkedin: 0,
    monthly_revenue: 0,
    expiring_soon: 0,
    total_plans: 0
  });
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchAttendanceData();
    fetchCalendarData();
  }, [selectedMonth]);

  const fetchAttendanceData = async () => {
    try {
      const response = await axios.get(`${API}/attendance/stats/30`);
      setAttendanceStats(response.data);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const response = await axios.get(`${API}/attendance/calendar/${year}/${month}`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, checkinsResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/attendance/today`).catch(() => 
          axios.get(`${API}/checkins/today`)
        )
      ]);

      setStats(statsResponse.data);
      setRecentCheckins(checkinsResponse.data.slice(0, 5)); // Show last 5 checkins
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    if (!calendarData) return null;

    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = calendarData.days.find(d => d.day === day);
      const attendance = dayData ? dayData.total_attendance : 0;
      const uniqueMembers = dayData ? dayData.unique_members : 0;
      
      days.push(
        <div
          key={day}
          className={`p-2 text-center cursor-pointer rounded-lg transition-colors ${
            attendance > 0 
              ? 'bg-blue-100 hover:bg-blue-200 border-2 border-blue-300' 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          title={attendance > 0 ? `${attendance} check-ins, ${uniqueMembers} unique members` : 'No attendance'}
        >
          <div className="text-sm font-medium">{day}</div>
          {attendance > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              {attendance}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Members',
      value: stats.total_members,
      icon: '👥',
      color: 'bg-blue-500'
    },
    {
      title: 'Active Members',
      value: stats.active_members,
      icon: '✅',
      color: 'bg-green-500'
    },
    {
      title: "Today's Check-ins",
      value: stats.today_checkins,
      icon: '📅',
      color: 'bg-purple-500'
    },
    {
      title: 'Currently In',
      value: stats.current_checkedin,
      icon: '🏃',
      color: 'bg-orange-500'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats.monthly_revenue.toLocaleString()}`,
      icon: '💰',
      color: 'bg-emerald-500'
    },
    {
      title: 'Expiring Soon',
      value: stats.expiring_soon,
      icon: '⚠️',
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your gym performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3 text-white text-xl mr-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 30-Day Attendance Calendar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Attendance Calendar</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ← Previous
            </button>
            <span className="font-medium text-gray-700">
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              Next →
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded mr-2"></div>
              <span>Has attendance</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-50 rounded mr-2"></div>
              <span>No attendance</span>
            </div>
          </div>
          <div>
            Click on a day to see detailed attendance
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('members')}
              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-blue-900">Add New Member</span>
              <span className="text-blue-600">→</span>
            </button>
            <button
              onClick={() => onNavigate('checkin')}
              className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-green-900">Check-in Member</span>
              <span className="text-green-600">→</span>
            </button>
            <button
              onClick={() => onNavigate('plans')}
              className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-purple-900">Manage Plans</span>
              <span className="text-purple-600">→</span>
            </button>
            <button
              onClick={() => onNavigate('announcements')}
              className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-orange-900">Make Announcement</span>
              <span className="text-orange-600">→</span>
            </button>
          </div>
        </div>

        {/* Recent Check-ins */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Check-ins</h2>
          {recentCheckins.length > 0 ? (
            <div className="space-y-3">
              {recentCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{checkin.member_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(checkin.check_in_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No check-ins today</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {stats.expiring_soon > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-3">⚠️</div>
            <div>
              <h3 className="font-medium text-yellow-800">Memberships Expiring Soon</h3>
              <p className="text-yellow-700">
                {stats.expiring_soon} memberships are expiring within the next 7 days. 
                Consider reaching out to these members for renewal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
