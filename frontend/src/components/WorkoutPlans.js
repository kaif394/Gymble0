import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkoutPlans = ({ onNavigate }) => {
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    target_muscle_groups: [''],
    estimated_duration: '',
    difficulty_level: 'Beginner',
    exercises: [{
      exercise_name: '',
      sets: '',
      reps: '',
      weight: '',
      rest_time: '',
      notes: ''
    }]
  });

  const [assignForm, setAssignForm] = useState({
    member_id: '',
    plan_id: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchWorkoutTemplates();
    fetchMembers();
    fetchAssignments();
  }, []);

  const fetchWorkoutTemplates = async () => {
    try {
      const response = await axios.get(`${API}/workout-templates`);
      setWorkoutTemplates(response.data);
    } catch (error) {
      console.error('Error fetching workout templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembers(response.data.filter(member => member.membership_status === 'active'));
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      // We'll fetch assignments for all members and filter by workout type
      const allAssignments = [];
      for (const member of members) {
        try {
          const response = await axios.get(`${API}/plan-assignments/member/${member.id}`);
          allAssignments.push(...response.data.filter(a => a.plan_type === 'workout'));
        } catch (error) {
          console.error(`Error fetching assignments for member ${member.id}:`, error);
        }
      }
      setAssignments(allAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleTemplateInputChange = (e) => {
    const { name, value } = e.target;
    setTemplateForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMuscleGroupChange = (index, value) => {
    const newGroups = [...templateForm.target_muscle_groups];
    newGroups[index] = value;
    setTemplateForm(prev => ({
      ...prev,
      target_muscle_groups: newGroups
    }));
  };

  const addMuscleGroup = () => {
    setTemplateForm(prev => ({
      ...prev,
      target_muscle_groups: [...prev.target_muscle_groups, '']
    }));
  };

  const removeMuscleGroup = (index) => {
    setTemplateForm(prev => ({
      ...prev,
      target_muscle_groups: prev.target_muscle_groups.filter((_, i) => i !== index)
    }));
  };

  const handleExerciseChange = (index, field, value) => {
    const newExercises = [...templateForm.exercises];
    newExercises[index] = {
      ...newExercises[index],
      [field]: value
    };
    setTemplateForm(prev => ({
      ...prev,
      exercises: newExercises
    }));
  };

  const addExercise = () => {
    setTemplateForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
        exercise_name: '',
        sets: '',
        reps: '',
        weight: '',
        rest_time: '',
        notes: ''
      }]
    }));
  };

  const removeExercise = (index) => {
    setTemplateForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      category: '',
      target_muscle_groups: [''],
      estimated_duration: '',
      difficulty_level: 'Beginner',
      exercises: [{
        exercise_name: '',
        sets: '',
        reps: '',
        weight: '',
        rest_time: '',
        notes: ''
      }]
    });
    setEditingTemplate(null);
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submitData = {
        ...templateForm,
        estimated_duration: parseInt(templateForm.estimated_duration),
        target_muscle_groups: templateForm.target_muscle_groups.filter(g => g.trim() !== ''),
        exercises: templateForm.exercises.filter(ex => ex.exercise_name.trim() !== '').map(ex => ({
          ...ex,
          sets: parseInt(ex.sets) || 0
        }))
      };

      if (editingTemplate) {
        await axios.put(`${API}/workout-templates/${editingTemplate.id}`, submitData);
        alert('Workout template updated successfully!');
      } else {
        await axios.post(`${API}/workout-templates`, submitData);
        alert('Workout template created successfully!');
      }
      
      resetTemplateForm();
      setShowTemplateForm(false);
      fetchWorkoutTemplates();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save workout template');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setTemplateForm({
      name: template.name,
      description: template.description,
      category: template.category,
      target_muscle_groups: template.target_muscle_groups.length > 0 ? template.target_muscle_groups : [''],
      estimated_duration: template.estimated_duration.toString(),
      difficulty_level: template.difficulty_level,
      exercises: template.exercises.length > 0 ? template.exercises : [{
        exercise_name: '',
        sets: '',
        reps: '',
        weight: '',
        rest_time: '',
        notes: ''
      }]
    });
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this workout template?')) {
      try {
        await axios.delete(`${API}/workout-templates/${templateId}`);
        alert('Workout template deleted successfully!');
        fetchWorkoutTemplates();
      } catch (error) {
        alert(error.response?.data?.detail || 'Failed to delete workout template');
      }
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/plan-assignments`, {
        ...assignForm,
        plan_type: 'workout',
        start_date: assignForm.start_date ? new Date(assignForm.start_date).toISOString() : null,
        end_date: assignForm.end_date ? new Date(assignForm.end_date).toISOString() : null
      });
      
      alert('Workout plan assigned successfully!');
      setAssignForm({
        member_id: '',
        plan_id: '',
        start_date: '',
        end_date: '',
        notes: ''
      });
      setShowAssignForm(false);
      fetchAssignments();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to assign workout plan');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && workoutTemplates.length === 0) {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workout Plans</h1>
          <p className="text-gray-600">Create workout templates and assign them to members</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTemplateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Template
          </button>
          <button
            onClick={() => setShowAssignForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Assign Plan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Templates ({workoutTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'assignments'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {workoutTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workoutTemplates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty_level)}`}>
                      {template.difficulty_level}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{template.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <strong>Category:</strong> {template.category}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Duration:</strong> {template.estimated_duration} minutes
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Exercises:</strong> {template.exercises.length}
                    </div>
                    {template.target_muscle_groups.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <strong>Muscle Groups:</strong> {template.target_muscle_groups.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏋️‍♂️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workout templates yet</h3>
              <p className="text-gray-600 mb-4">Create your first workout template to get started</p>
              <button
                onClick={() => setShowTemplateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          {assignments.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Member</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Workout Plan</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Assigned Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{assignment.member_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-gray-900">{assignment.plan_name}</div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => {
                              if (window.confirm('Remove this workout plan assignment?')) {
                                axios.delete(`${API}/plan-assignments/${assignment.id}`)
                                  .then(() => {
                                    alert('Assignment removed successfully!');
                                    fetchAssignments();
                                  })
                                  .catch(() => alert('Failed to remove assignment'));
                              }
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-600 mb-4">Start assigning workout plans to your members</p>
              <button
                onClick={() => setShowAssignForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Assign First Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTemplate ? 'Edit Workout Template' : 'Create Workout Template'}
                </h2>
                <button
                  onClick={() => {
                    setShowTemplateForm(false);
                    resetTemplateForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTemplateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={templateForm.name}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={templateForm.category}
                      onChange={handleTemplateInputChange}
                      placeholder="e.g., Strength, Cardio, HIIT"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={templateForm.description}
                    onChange={handleTemplateInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="estimated_duration"
                      value={templateForm.estimated_duration}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty Level
                    </label>
                    <select
                      name="difficulty_level"
                      value={templateForm.difficulty_level}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Target Muscle Groups */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Muscle Groups
                  </label>
                  {templateForm.target_muscle_groups.map((group, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={group}
                        onChange={(e) => handleMuscleGroupChange(index, e.target.value)}
                        placeholder="e.g., Chest, Back, Legs"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {templateForm.target_muscle_groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMuscleGroup(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMuscleGroup}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    + Add Muscle Group
                  </button>
                </div>

                {/* Exercises */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercises
                  </label>
                  {templateForm.exercises.map((exercise, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Exercise {index + 1}</h4>
                        {templateForm.exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExercise(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={exercise.exercise_name}
                            onChange={(e) => handleExerciseChange(index, 'exercise_name', e.target.value)}
                            placeholder="Exercise name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                            placeholder="Sets"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={exercise.reps}
                            onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                            placeholder="Reps (e.g., 10-12)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={exercise.weight}
                            onChange={(e) => handleExerciseChange(index, 'weight', e.target.value)}
                            placeholder="Weight (e.g., 50kg)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={exercise.rest_time}
                            onChange={(e) => handleExerciseChange(index, 'rest_time', e.target.value)}
                            placeholder="Rest time (e.g., 60s)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={exercise.notes}
                            onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                            placeholder="Notes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addExercise}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    + Add Exercise
                  </button>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateForm(false);
                      resetTemplateForm();
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Assign Workout Plan</h2>
                <button
                  onClick={() => setShowAssignForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Member
                  </label>
                  <select
                    value={assignForm.member_id}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, member_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Workout Plan
                  </label>
                  <select
                    value={assignForm.plan_id}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, plan_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a workout plan</option>
                    {workoutTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={assignForm.start_date}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={assignForm.end_date}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any specific instructions or notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Assigning...' : 'Assign Plan'}
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

export default WorkoutPlans;