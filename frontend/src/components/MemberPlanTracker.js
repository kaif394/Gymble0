import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const MemberPlanTracker = ({ onNavigate }) => {
  const [planAssignments, setPlanAssignments] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState({});
  const [dietTemplates, setDietTemplates] = useState({});
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [workoutProgressForm, setWorkoutProgressForm] = useState({
    scheduled_date: new Date().toISOString().split('T')[0],
    duration_minutes: '',
    exercises_progress: [],
    overall_rating: 5,
    notes: '',
    status: 'completed'
  });

  const [dietProgressForm, setDietProgressForm] = useState({
    date: new Date().toISOString().split('T')[0],
    meals_progress: [],
    total_calories_consumed: '',
    water_intake_liters: '',
    overall_rating: 5,
    notes: ''
  });

  useEffect(() => {
    fetchPlanAssignments();
  }, []);

  const fetchPlanAssignments = async () => {
    try {
      const response = await axios.get(`${API}/plan-assignments/my`);
      setPlanAssignments(response.data);

      // Fetch workout and diet templates
      const workoutIds = response.data.filter(a => a.plan_type === 'workout').map(a => a.plan_id);
      const dietIds = response.data.filter(a => a.plan_type === 'diet').map(a => a.plan_id);

      const workoutData = {};
      const dietData = {};

      for (const id of workoutIds) {
        try {
          const res = await axios.get(`${API}/workout-templates/${id}`);
          workoutData[id] = res.data;
        } catch (error) {
          console.error(`Error fetching workout template ${id}:`, error);
        }
      }

      for (const id of dietIds) {
        try {
          const res = await axios.get(`${API}/diet-templates/${id}`);
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

  const handleWorkoutProgress = (assignment) => {
    setSelectedAssignment(assignment);
    const template = workoutTemplates[assignment.plan_id];
    
    if (template) {
      setWorkoutProgressForm({
        scheduled_date: new Date().toISOString().split('T')[0],
        duration_minutes: template.estimated_duration?.toString() || '',
        exercises_progress: template.exercises.map(exercise => ({
          exercise_name: exercise.exercise_name,
          completed_sets: 0,
          completed_reps: [],
          weights_used: [],
          notes: ''
        })),
        overall_rating: 5,
        notes: '',
        status: 'completed'
      });
    }
    
    setShowWorkoutForm(true);
  };

  const handleDietProgress = (assignment) => {
    setSelectedAssignment(assignment);
    const template = dietTemplates[assignment.plan_id];
    
    if (template) {
      setDietProgressForm({
        date: new Date().toISOString().split('T')[0],
        meals_progress: template.meals.map(meal => ({
          meal_type: meal.meal_type,
          items_consumed: meal.items.map(item => item.food_name),
          total_calories: meal.items.reduce((sum, item) => sum + (item.calories || 0), 0),
          notes: ''
        })),
        total_calories_consumed: template.total_calories?.toString() || '',
        water_intake_liters: '',
        overall_rating: 5,
        notes: ''
      });
    }
    
    setShowDietForm(true);
  };

  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/workout-progress`, {
        assignment_id: selectedAssignment.id,
        scheduled_date: new Date(workoutProgressForm.scheduled_date).toISOString(),
        duration_minutes: parseInt(workoutProgressForm.duration_minutes) || null,
        exercises_progress: workoutProgressForm.exercises_progress,
        overall_rating: workoutProgressForm.overall_rating,
        notes: workoutProgressForm.notes,
        status: workoutProgressForm.status
      });
      
      alert('Workout progress logged successfully!');
      setShowWorkoutForm(false);
      setSelectedAssignment(null);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to log workout progress');
    } finally {
      setLoading(false);
    }
  };

  const handleDietSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/diet-progress`, {
        assignment_id: selectedAssignment.id,
        date: new Date(dietProgressForm.date).toISOString(),
        meals_progress: dietProgressForm.meals_progress,
        total_calories_consumed: parseInt(dietProgressForm.total_calories_consumed) || null,
        water_intake_liters: parseFloat(dietProgressForm.water_intake_liters) || null,
        overall_rating: dietProgressForm.overall_rating,
        notes: dietProgressForm.notes
      });
      
      alert('Diet progress logged successfully!');
      setShowDietForm(false);
      setSelectedAssignment(null);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to log diet progress');
    } finally {
      setLoading(false);
    }
  };

  const updateExerciseProgress = (index, field, value) => {
    const updated = [...workoutProgressForm.exercises_progress];
    if (field === 'completed_reps' || field === 'weights_used') {
      updated[index][field] = value.split(',').map(v => v.trim()).filter(v => v);
    } else {
      updated[index][field] = value;
    }
    setWorkoutProgressForm(prev => ({
      ...prev,
      exercises_progress: updated
    }));
  };

  const updateMealProgress = (index, field, value) => {
    const updated = [...dietProgressForm.meals_progress];
    if (field === 'items_consumed') {
      updated[index][field] = value.split(',').map(v => v.trim()).filter(v => v);
    } else {
      updated[index][field] = value;
    }
    setDietProgressForm(prev => ({
      ...prev,
      meals_progress: updated
    }));
  };

  const getAssignmentTypeIcon = (type) => {
    return type === 'workout' ? '🏋️‍♂️' : '🥗';
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  if (loading && planAssignments.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-900">My Fitness Plans</h1>
        <p className="text-gray-600">Track and complete your assigned workout and diet plans</p>
      </div>

      {/* Plan Cards */}
      {planAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planAssignments.map((assignment) => {
            const template = assignment.plan_type === 'workout' 
              ? workoutTemplates[assignment.plan_id] 
              : dietTemplates[assignment.plan_id];

            return (
              <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">{getAssignmentTypeIcon(assignment.plan_type)}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{assignment.plan_name}</h3>
                    <p className="text-sm text-gray-600">{assignment.plan_type.charAt(0).toUpperCase() + assignment.plan_type.slice(1)} Plan</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.is_active)}`}>
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
                          <strong>Difficulty:</strong> {template.difficulty_level}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Duration:</strong> {template.estimated_duration} min
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Exercises:</strong> {template.exercises.length}
                        </div>
                      </>
                    )}
                    
                    {assignment.plan_type === 'diet' && (
                      <>
                        <div className="text-sm text-gray-600">
                          <strong>Goal:</strong> {template.goal}
                        </div>
                        {template.total_calories && (
                          <div className="text-sm text-gray-600">
                            <strong>Target Calories:</strong> {template.total_calories}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          <strong>Meals:</strong> {template.meals.length}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-600">
                    <strong>Assigned by:</strong> {assignment.assigned_by}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Start date:</strong> {new Date(assignment.start_date).toLocaleDateString()}
                  </div>
                </div>

                {assignment.notes && (
                  <div className="bg-gray-50 p-3 rounded-md mb-4">
                    <p className="text-sm text-gray-700"><strong>Notes:</strong> {assignment.notes}</p>
                  </div>
                )}

                {assignment.is_active && (
                  <div className="space-y-2">
                    <button
                      onClick={() => assignment.plan_type === 'workout' ? handleWorkoutProgress(assignment) : handleDietProgress(assignment)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Log {assignment.plan_type === 'workout' ? 'Workout' : 'Diet'} Progress
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No plans assigned</h3>
          <p className="text-gray-600">Your trainer will assign workout and diet plans soon</p>
        </div>
      )}

      {/* Workout Progress Modal */}
      {showWorkoutForm && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Log Workout Progress</h2>
                <button
                  onClick={() => setShowWorkoutForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">{selectedAssignment.plan_name}</h3>
                <p className="text-blue-700">{workoutTemplates[selectedAssignment.plan_id]?.description}</p>
              </div>

              <form onSubmit={handleWorkoutSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workout Date
                    </label>
                    <input
                      type="date"
                      value={workoutProgressForm.scheduled_date}
                      onChange={(e) => setWorkoutProgressForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={workoutProgressForm.duration_minutes}
                      onChange={(e) => setWorkoutProgressForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Rating
                    </label>
                    <select
                      value={workoutProgressForm.overall_rating}
                      onChange={(e) => setWorkoutProgressForm(prev => ({ ...prev, overall_rating: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5].map(rating => (
                        <option key={rating} value={rating}>{'⭐'.repeat(rating)} ({rating}/5)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exercise Progress */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Exercise Progress</h3>
                  {workoutProgressForm.exercises_progress.map((exercise, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">{exercise.exercise_name}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sets Completed
                          </label>
                          <input
                            type="number"
                            value={exercise.completed_sets}
                            onChange={(e) => updateExerciseProgress(index, 'completed_sets', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reps (comma separated)
                          </label>
                          <input
                            type="text"
                            value={exercise.completed_reps.join(', ')}
                            onChange={(e) => updateExerciseProgress(index, 'completed_reps', e.target.value)}
                            placeholder="10, 8, 6"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weights (comma separated)
                          </label>
                          <input
                            type="text"
                            value={exercise.weights_used.join(', ')}
                            onChange={(e) => updateExerciseProgress(index, 'weights_used', e.target.value)}
                            placeholder="50kg, 45kg, 40kg"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={exercise.notes}
                            onChange={(e) => updateExerciseProgress(index, 'notes', e.target.value)}
                            placeholder="Form notes, difficulty"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overall Notes
                  </label>
                  <textarea
                    value={workoutProgressForm.notes}
                    onChange={(e) => setWorkoutProgressForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="How did the workout feel? Any achievements or challenges?"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWorkoutForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Logging...' : 'Log Progress'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Diet Progress Modal */}
      {showDietForm && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Log Diet Progress</h2>
                <button
                  onClick={() => setShowDietForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900">{selectedAssignment.plan_name}</h3>
                <p className="text-green-700">{dietTemplates[selectedAssignment.plan_id]?.description}</p>
              </div>

              <form onSubmit={handleDietSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={dietProgressForm.date}
                      onChange={(e) => setDietProgressForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Calories
                    </label>
                    <input
                      type="number"
                      value={dietProgressForm.total_calories_consumed}
                      onChange={(e) => setDietProgressForm(prev => ({ ...prev, total_calories_consumed: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Water Intake (Liters)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={dietProgressForm.water_intake_liters}
                      onChange={(e) => setDietProgressForm(prev => ({ ...prev, water_intake_liters: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Rating
                    </label>
                    <select
                      value={dietProgressForm.overall_rating}
                      onChange={(e) => setDietProgressForm(prev => ({ ...prev, overall_rating: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5].map(rating => (
                        <option key={rating} value={rating}>{'⭐'.repeat(rating)} ({rating}/5)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Meal Progress */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Progress</h3>
                  {dietProgressForm.meals_progress.map((meal, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">{meal.meal_type}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Foods Consumed (comma separated)
                          </label>
                          <input
                            type="text"
                            value={meal.items_consumed.join(', ')}
                            onChange={(e) => updateMealProgress(index, 'items_consumed', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Calories
                          </label>
                          <input
                            type="number"
                            value={meal.total_calories}
                            onChange={(e) => updateMealProgress(index, 'total_calories', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={meal.notes}
                            onChange={(e) => updateMealProgress(index, 'notes', e.target.value)}
                            placeholder="How did it taste? Portion size?"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overall Notes
                  </label>
                  <textarea
                    value={dietProgressForm.notes}
                    onChange={(e) => setDietProgressForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="How did you feel today? Energy levels, cravings, etc."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDietForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Logging...' : 'Log Progress'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPlanTracker;