import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const MemberProfileManager = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergency_contact: ''
  });
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch member profile
      try {
        const memberResponse = await axios.get(`${API}/members/me`, { headers });
        const member = memberResponse.data;
        setProfileData({
          name: member.name || '',
          email: member.email || '',
          phone: member.phone || '',
          address: member.address || '',
          emergency_contact: member.emergency_contact || ''
        });
        setMembershipInfo(member);
      } catch (error) {
        console.error('Error fetching member profile:', error);
        // Fallback to user data
        setProfileData({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          address: '',
          emergency_contact: ''
        });
      }

      // Fetch payment history
      try {
        const paymentsResponse = await axios.get(`${API}/payments/my-history`, { headers });
        setPaymentHistory(paymentsResponse.data || []);
      } catch (error) {
        console.error('Error fetching payment history:', error);
        setPaymentHistory([]);
      }

    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!profileData.name.trim()) newErrors.name = 'Name is required';
    if (!profileData.email.trim()) newErrors.email = 'Email is required';
    if (!profileData.phone.trim()) newErrors.phone = 'Phone is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      await axios.put(`${API}/members/me`, {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        emergency_contact: profileData.emergency_contact
      }, { headers });

      alert('Profile updated successfully! ✅');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getMembershipStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysRemaining = () => {
    if (!membershipInfo?.end_date) return 0;
    const endDate = new Date(membershipInfo.end_date);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8 text-white">
          <div className="text-center">
            <div className="text-4xl mb-2">👤</div>
            <h1 className="text-2xl font-bold mb-2">My Profile</h1>
            <p className="text-purple-100">Manage your account & membership</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 mx-4 mt-4 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('membership')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'membership'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            💳 Membership
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'payments'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            💰 Payments
          </button>
        </div>

        <div className="p-4">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                      placeholder="Enter your email"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={profileData.address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact"
                      value={profileData.emergency_contact}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Emergency contact number"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </form>
              </div>

              {/* Logout Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
                <button
                  onClick={logout}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}

          {/* Membership Tab */}
          {activeTab === 'membership' && (
            <div className="space-y-6">
              {membershipInfo && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🏋️‍♂️</div>
                    <h3 className="text-lg font-semibold text-gray-900">Membership Details</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMembershipStatusColor(membershipInfo.membership_status)}`}>
                        {membershipInfo.membership_status?.charAt(0).toUpperCase() + membershipInfo.membership_status?.slice(1)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Plan</span>
                      <span className="font-medium text-gray-900">{membershipInfo.plan_name || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Start Date</span>
                      <span className="font-medium text-gray-900">
                        {membershipInfo.start_date ? formatDate(membershipInfo.start_date) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">End Date</span>
                      <span className="font-medium text-gray-900">
                        {membershipInfo.end_date ? formatDate(membershipInfo.end_date) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Days Remaining</span>
                      <span className={`font-bold ${getDaysRemaining() <= 7 ? 'text-red-600' : 'text-green-600'}`}>
                        {getDaysRemaining()} days
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Visits</span>
                      <span className="font-medium text-gray-900">{membershipInfo.total_visits || 0}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Last Visit</span>
                      <span className="font-medium text-gray-900">
                        {membershipInfo.last_visit ? formatDate(membershipInfo.last_visit) : 'Never'}
                      </span>
                    </div>
                  </div>

                  {getDaysRemaining() <= 7 && getDaysRemaining() > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="text-center">
                        <div className="text-2xl mb-2">⚠️</div>
                        <p className="text-yellow-800 font-medium">Membership Expiring Soon!</p>
                        <p className="text-yellow-700 text-sm">Contact your gym to renew your membership</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">💰</div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                </div>

                {paymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{payment.plan_name}</h4>
                            <p className="text-sm text-gray-600">
                              {formatDate(payment.payment_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">₹{payment.amount}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p><strong>Method:</strong> {payment.payment_method?.replace('_', ' ')}</p>
                          {payment.transaction_id && (
                            <p><strong>Transaction ID:</strong> {payment.transaction_id}</p>
                          )}
                          {payment.notes && (
                            <p><strong>Notes:</strong> {payment.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                    <p className="text-gray-600">Your payment records will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Space */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default MemberProfileManager;