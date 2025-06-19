import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Import all components
import { AuthProvider, useAuth } from './components/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import CheckIn from './components/CheckIn';
import Members from './components/Members';
import Plans from './components/Plans';
import WorkoutPlans from './components/WorkoutPlans';
import DietPlans from './components/DietPlans';
import Announcements from './components/Announcements';
import GymSetupForm from './components/GymSetupForm';
import MemberDashboard from './components/MemberDashboard';
import MemberPlanTracker from './components/MemberPlanTracker';

// Import enhanced member components
import PublicMemberRegistration from './components/PublicMemberRegistration';
import EnhancedMemberDashboard from './components/EnhancedMemberDashboard';
import TodoStylePlanTracker from './components/TodoStylePlanTracker';
import MobileQRScanner from './components/MobileQRScanner';
import MemberProfileManager from './components/MemberProfileManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const AuthenticatedApp = ({ currentView, setCurrentView }) => {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [gym, setGym] = useState(null);
  const [showPublicRegistration, setShowPublicRegistration] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchGymInfo();
    }
  }, [isAuthenticated, user]);

  const fetchGymInfo = async () => {
    try {
      const response = await axios.get(`${API}/gyms/my`);
      setGym(response.data);
    } catch (error) {
      console.error('Error fetching gym info:', error);
    }
  };

  // Handle public member registration
  const handlePublicRegistrationSuccess = (registrationData) => {
    setShowPublicRegistration(false);
    alert('Registration successful! Please login with your credentials.');
  };

  // Show public registration if requested
  if (showPublicRegistration) {
    return (
      <PublicMemberRegistration 
        onSuccess={handlePublicRegistrationSuccess}
        onBack={() => setShowPublicRegistration(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onShowMemberRegistration={() => setShowPublicRegistration(true)} />;
  }

  if (!gym) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Setup Your Gym</h2>
            <p className="text-gray-600 mt-2">Complete your gym registration</p>
          </div>
          <GymSetupForm onComplete={() => fetchGymInfo()} />
        </div>
      </div>
    );
  }

  const renderView = () => {
    // Member views - Enhanced mobile-first experience
    if (user?.role === 'member') {
      switch (currentView) {
        case 'dashboard':
          return <EnhancedMemberDashboard onNavigate={setCurrentView} />;
        case 'my-plans':
          return <TodoStylePlanTracker onNavigate={setCurrentView} />;
        case 'checkin':
          return <MobileQRScanner onNavigate={setCurrentView} />;
        case 'profile':
          return <MemberProfileManager onNavigate={setCurrentView} />;
        case 'announcements':
          return <Announcements onNavigate={setCurrentView} />;
        default:
          return <EnhancedMemberDashboard onNavigate={setCurrentView} />;
      }
    }

    // Gym owner/staff views
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'checkin':
        return <CheckIn onNavigate={setCurrentView} />;
      case 'members':
        return <Members onNavigate={setCurrentView} />;
      case 'plans':
        return <Plans onNavigate={setCurrentView} />;
      case 'workout-plans':
        return <WorkoutPlans onNavigate={setCurrentView} />;
      case 'diet-plans':
        return <DietPlans onNavigate={setCurrentView} />;
      case 'announcements':
        return <Announcements onNavigate={setCurrentView} />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* For members, use mobile-first navigation */}
      {user?.role === 'member' ? (
        <>
          {/* Mobile Member Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="max-w-md mx-auto">
              <div className="flex">
                {['dashboard', 'my-plans', 'checkin', 'profile'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`flex-1 py-3 px-2 text-center transition-colors ${
                      currentView === view
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}
                  >
                    <div className="text-lg mb-1">
                      {view === 'dashboard' && '🏠'}
                      {view === 'my-plans' && '📋'}
                      {view === 'checkin' && '📱'}
                      {view === 'profile' && '👤'}
                    </div>
                    <div className="text-xs font-medium">
                      {view === 'dashboard' && 'Home'}
                      {view === 'my-plans' && 'Plans'}
                      {view === 'checkin' && 'Check-in'}
                      {view === 'profile' && 'Profile'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Member Content */}
          {renderView()}
        </>
      ) : (
        // Desktop gym owner interface
        <>
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">{gym?.name || 'GYMBLE'}</h1>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm text-gray-600">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="bg-white border-b px-6 py-2">
            <div className="flex space-x-6">
              {['dashboard', 'checkin', 'members', 'plans', 'workout-plans', 'diet-plans', 'announcements'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === view
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {view === 'workout-plans' ? 'Workout Plans' : 
                   view === 'diet-plans' ? 'Diet Plans' :
                   view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          {renderView()}
        </>
      )}
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <AuthProvider>
      <AuthenticatedApp currentView={currentView} setCurrentView={setCurrentView} />
    </AuthProvider>
  );
}

export default App;
