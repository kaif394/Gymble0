import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const TodoStylePlanTracker = ({ onNavigate }) => {
  const [planAssignments, setPlanAssignments] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState({});
  const [dietTemplates, setDietTemplates] = useState({});
  const [activeTab, setActiveTab] = useState('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [progressItems, setProgressItems] = useState([]);

  useEffect(() => {
    fetchPlanAssignments();
  }, []);

  useEffect(() => {
    generateProgressItems();
  }, [planAssignments, workoutTemplates, dietTemplates, selectedDate]);

  const fetchPlanAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const response = await axios.get(`${API}/plan-assignments/my`, { headers });
      setPlanAssignments(response.data);

      // Fetch templates
      const workoutIds = response.data.filter(a => a.plan_type === 'workout').map(a => a.plan_id);
      const dietIds = response.data.filter(a => a.plan_type === 'diet').map(a => a.plan_id);

      const workoutData = {};
      const dietData = {};

      for (const id of workoutIds) {
        try {
          const res = await axios.get(`${API}/workout-templates/${id}`, { headers });
          workoutData[id] = res.data;
        } catch (error) {
          console.error(`Error fetching workout template ${id}:`, error);
        }
      }

      for (const id of dietIds) {
        try {
          const res = await axios.get(`${API}/diet-templates/${id}`, { headers });
          dietData[id] = res.data;
        } catch (error) {
          console.error(`Error fetching diet template ${id}:`, error);
        }
      }

      setWorkoutTemplates(workoutData);
      setDietTemplates(dietData);
    } catch (error) {
      console.error('Error fetching plan assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateProgressItems = () => {
    const items = [];
    const today = new Date(selectedDate);

    // Generate workout items
    planAssignments.forEach(assignment => {
      if (assignment.plan_type === 'workout' && assignment.is_active) {
        const template = workoutTemplates[assignment.plan_id];
        if (template) {
          items.push({
            id: `workout-${assignment.id}-${selectedDate}`,
            type: 'workout',
            assignment,
            template,
            title: template.name,
            description: `${template.exercises.length} exercises • ${template.estimated_duration || 'N/A'} min`,
            icon: '🏋️‍♂️',
            priority: 'high',
            completed: false,
            category: template.category || 'Workout'
          });
        }
      }
    });

    // Generate diet items
    planAssignments.forEach(assignment => {
      if (assignment.plan_type === 'diet' && assignment.is_active) {
        const template = dietTemplates[assignment.plan_id];
        if (template) {
          template.meals?.forEach((meal, index) => {
            items.push({
              id: `diet-${assignment.id}-${selectedDate}-${index}`,
              type: 'diet',
              assignment,
              template,
              meal,
              title: `${meal.meal_type} - ${template.name}`,
              description: `${meal.items.length} items • ${meal.time || 'Anytime'}`,
              icon: getMealIcon(meal.meal_type),
              priority: 'medium',
              completed: false,
              category: meal.meal_type
            });
          });
        }
      }
    });

    setProgressItems(items);
  };

  const getMealIcon = (mealType) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🍽️';
      case 'dinner': return '🍝';
      case 'snack': return '🍎';
      default: return '🥗';
    }
  };

  const handleCompleteItem = async (item) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      if (item.type === 'workout') {
        await axios.post(`${API}/workout-progress`, {
          assignment_id: item.assignment.id,
          scheduled_date: new Date(selectedDate).toISOString(),
          status: 'completed',
          overall_rating: 5,
          notes: 'Completed via mobile app',
          exercises_progress: item.template.exercises.map(exercise => ({
            exercise_name: exercise.exercise_name,
            completed_sets: exercise.sets || 0,
            completed_reps: [],
            weights_used: [],
            notes: 'Completed'
          }))
        }, { headers });
      } else if (item.type === 'diet') {
        await axios.post(`${API}/diet-progress`, {
          assignment_id: item.assignment.id,
          date: new Date(selectedDate).toISOString(),
          meals_progress: [{
            meal_type: item.meal.meal_type,
            items_consumed: item.meal.items.map(i => i.food_name),
            total_calories: item.meal.items.reduce((sum, i) => sum + (i.calories || 0), 0),
            notes: 'Completed via mobile app'
          }],
          overall_rating: 5,
          notes: 'Completed via mobile app'
        }, { headers });
      }

      // Update local state
      setProgressItems(prev => prev.map(p => 
        p.id === item.id ? { ...p, completed: true } : p
      ));

    } catch (error) {
      console.error('Error marking item as complete:', error);
      alert('Failed to mark as complete. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getCompletionStats = () => {
    const total = progressItems.length;
    const completed = progressItems.filter(item => item.completed).length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const stats = getCompletionStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">My Fitness Plan 💪</h1>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.percentage}%</div>
              <div className="text-xs text-green-100">Complete</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
          
          <div className="text-green-100 text-sm">
            {stats.completed} of {stats.total} tasks completed today
          </div>
        </div>

        {/* Date Selector */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : new Date(selectedDate).toLocaleDateString()}
            </h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 mx-4 mt-4 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'today'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            📅 Today's Tasks
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            📋 All Plans
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'today' && (
            <div>
              {progressItems.length > 0 ? (
                <div className="space-y-3">
                  {progressItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        item.completed 
                          ? 'border-green-200 bg-green-50' 
                          : getPriorityColor(item.priority)
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{item.icon}</div>
                          <div className="flex-1">
                            <h3 className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full mt-1">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleCompleteItem(item)}
                          disabled={item.completed}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            item.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                          }`}
                        >
                          {item.completed && '✓'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks for today</h3>
                  <p className="text-gray-600 mb-6">Check back later or view all your plans</p>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="bg-blue-600 text-white py-2 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    View All Plans
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div>
              {planAssignments.length > 0 ? (
                <div className="space-y-4">
                  {planAssignments.map((assignment) => {
                    const template = assignment.plan_type === 'workout' 
                      ? workoutTemplates[assignment.plan_id] 
                      : dietTemplates[assignment.plan_id];

                    return (
                      <div key={assignment.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <span className="text-3xl">
                            {assignment.plan_type === 'workout' ? '🏋️‍♂️' : '🥗'}
                          </span>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{assignment.plan_name}</h3>
                            <p className="text-sm text-gray-600">
                              {assignment.plan_type.charAt(0).toUpperCase() + assignment.plan_type.slice(1)} Plan
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {template && (
                          <div className="space-y-2 mb-4">
                            {assignment.plan_type === 'workout' && (
                              <>
                                <div className="text-sm text-gray-600">
                                  <strong>Category:</strong> {template.category}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <strong>Exercises:</strong> {template.exercises.length}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <strong>Duration:</strong> {template.estimated_duration || 'N/A'} min
                                </div>
                              </>
                            )}
                            
                            {assignment.plan_type === 'diet' && (
                              <>
                                <div className="text-sm text-gray-600">
                                  <strong>Goal:</strong> {template.goal}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <strong>Meals:</strong> {template.meals?.length || 0}
                                </div>
                                {template.total_calories && (
                                  <div className="text-sm text-gray-600">
                                    <strong>Target Calories:</strong> {template.total_calories}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div className="text-sm text-gray-600 mb-4">
                          <strong>Assigned by:</strong> {assignment.assigned_by}
                        </div>

                        {assignment.notes && (
                          <div className="bg-gray-50 p-3 rounded-lg mb-4">
                            <p className="text-sm text-gray-700"><strong>Notes:</strong> {assignment.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No plans assigned</h3>
                  <p className="text-gray-600">Your trainer will assign workout and diet plans soon</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Space */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default TodoStylePlanTracker;