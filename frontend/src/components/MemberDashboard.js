import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const MemberDashboard = ({ onNavigate }) => {
  const [memberStats, setMemberStats] = useState(null);
  const [planAssignments, setPlanAssignments] = useState([]);
  const [workoutProgress, setWorkoutProgress] = useState([]);
  const [dietProgress, setDietProgress] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      // Fetch member stats
      const statsResponse = await axios.get(`${API}/members/me/stats`);
      setMemberStats(statsResponse.data);

      // Fetch plan assignments
      const assignmentsResponse = await axios.get(`${API}/plan-assignments/my`);
      setPlanAssignments(assignmentsResponse.data);

      // Fetch workout progress
      const workoutProgressResponse = await axios.get(`${API}/workout-progress/my`);
      setWorkoutProgress(workoutProgressResponse.data);

      // Fetch diet progress
      const dietProgressResponse = await axios.get(`${API}/diet-progress/my`);
      setDietProgress(dietProgressResponse.data);

      // Fetch announcements
      const announcementsResponse = await axios.get(`${API}/announcements/me`);
      setAnnouncements(announcementsResponse.data);

      // Fetch attendance status
      const attendanceResponse = await axios.get(`${API}/attendance/my-status`);
      setAttendanceStatus(attendanceResponse.data);

    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignmentTypeIcon = (type) => {
    return type === 'workout' ? '🏋️‍♂️' : '🥗';
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600">Track your fitness journey</p>
      </div>

      {/* Membership Status Card */}
      {memberStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Membership Status</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(memberStats.membership_status)}`}>
                  {memberStats.membership_status.charAt(0).toUpperCase() + memberStats.membership_status.slice(1)}
                </span>
                <span className="text-sm text-gray-600">
                  {memberStats.days_remaining > 0 ? `${memberStats.days_remaining} days left` : 'Expired'}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Current Plan</h3>
              <div className="text-lg font-semibold text-gray-900">{memberStats.plan_name}</div>
              <div className="text-sm text-gray-600">₹{memberStats.plan_price}</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Visits</h3>
              <div className="text-lg font-semibold text-gray-900">{memberStats.total_visits}</div>
              <div className="text-sm text-gray-600">
                Last visit: {memberStats.last_visit ? new Date(memberStats.last_visit).toLocaleDateString() : 'Never'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Status */}
      {attendanceStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Check-in Status</h3>
          <div className="flex items-center space-x-4">
            {attendanceStatus.status === 'not_checked_in' && (
              <div className="flex items-center text-orange-600">
                <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                Not checked in today
              </div>
            )}
            {attendanceStatus.status === 'checked_in' && (
              <div className="flex items-center text-green-600">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Checked in at {new Date(attendanceStatus.attendance.check_in_time).toLocaleTimeString()}
              </div>
            )}
            {attendanceStatus.status === 'checked_out' && (
              <div className="flex items-center text-blue-600">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Workout completed ({attendanceStatus.attendance.duration_minutes} minutes)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'plans'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Plans ({planAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'progress'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Progress
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'announcements'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Announcements ({announcements.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recent Plans */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Plans</h3>
            {planAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planAssignments.slice(0, 4).map((assignment) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getAssignmentTypeIcon(assignment.plan_type)}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{assignment.plan_name}</h4>
                        <p className="text-sm text-gray-600">{assignment.plan_type.charAt(0).toUpperCase() + assignment.plan_type.slice(1)} Plan</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No plans assigned yet</p>
              </div>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Announcements</h3>
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="border-l-4 border-blue-500 bg-blue-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                      <span className="text-xs text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{announcement.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No announcements yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div>
          {planAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{getAssignmentTypeIcon(assignment.plan_type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{assignment.plan_name}</h3>
                      <p className="text-sm text-gray-600">{assignment.plan_type.charAt(0).toUpperCase() + assignment.plan_type.slice(1)} Plan</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <strong>Assigned by:</strong> {assignment.assigned_by}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Start date:</strong> {new Date(assignment.start_date).toLocaleDateString()}
                    </div>
                    {assignment.end_date && (
                      <div className="text-sm text-gray-600">
                        <strong>End date:</strong> {new Date(assignment.end_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {assignment.notes && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700"><strong>Notes:</strong> {assignment.notes}</p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No plans assigned</h3>
              <p className="text-gray-600">Your trainer will assign workout and diet plans soon</p>
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Workout Progress */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workout Progress</h3>
            {workoutProgress.length > 0 ? (
              <div className="space-y-4">
                {workoutProgress.slice(0, 5).map((progress) => (
                  <div key={progress.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{progress.workout_name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        progress.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Date:</strong> {new Date(progress.scheduled_date).toLocaleDateString()}</div>
                      {progress.duration_minutes && (
                        <div><strong>Duration:</strong> {progress.duration_minutes} minutes</div>
                      )}
                      {progress.overall_rating && (
                        <div><strong>Rating:</strong> {'⭐'.repeat(progress.overall_rating)}</div>
                      )}
                    </div>
                    {progress.notes && (
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Notes:</strong> {progress.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No workout progress recorded yet</p>
              </div>
            )}
          </div>

          {/* Diet Progress */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Diet Progress</h3>
            {dietProgress.length > 0 ? (
              <div className="space-y-4">
                {dietProgress.slice(0, 5).map((progress) => (
                  <div key={progress.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{progress.diet_name}</h4>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Date:</strong> {new Date(progress.date).toLocaleDateString()}</div>
                      {progress.total_calories_consumed && (
                        <div><strong>Calories:</strong> {progress.total_calories_consumed}</div>
                      )}
                      {progress.water_intake_liters && (
                        <div><strong>Water:</strong> {progress.water_intake_liters}L</div>
                      )}
                      {progress.overall_rating && (
                        <div><strong>Rating:</strong> {'⭐'.repeat(progress.overall_rating)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No diet progress recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        announcement.priority === 'high' ? 'bg-red-100 text-red-800' :
                        announcement.priority === 'urgent' ? 'bg-red-200 text-red-900' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700">{announcement.content}</p>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Posted by:</strong> {announcement.created_by}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📢</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
              <p className="text-gray-600">Check back later for updates from your gym</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;