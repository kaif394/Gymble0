import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const DietPlans = ({ onNavigate }) => {
  const [dietTemplates, setDietTemplates] = useState([]);
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
    goal: '',
    total_calories: '',
    protein_target: '',
    carbs_target: '',
    fat_target: '',
    meals: [{
      meal_type: 'Breakfast',
      time: '',
      items: [{
        food_name: '',
        quantity: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        notes: ''
      }]
    }]
  });

  const [assignForm, setAssignForm] = useState({
    member_id: '',
    plan_id: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const goalTypes = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Cutting'];

  useEffect(() => {
    fetchDietTemplates();
    fetchMembers();
    fetchAssignments();
  }, []);

  const fetchDietTemplates = async () => {
    try {
      const response = await axios.get(`${API}/diet-templates`);
      setDietTemplates(response.data);
    } catch (error) {
      console.error('Error fetching diet templates:', error);
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
      // We'll fetch assignments for all members and filter by diet type
      const allAssignments = [];
      for (const member of members) {
        try {
          const response = await axios.get(`${API}/plan-assignments/member/${member.id}`);
          allAssignments.push(...response.data.filter(a => a.plan_type === 'diet'));
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

  const handleMealChange = (mealIndex, field, value) => {
    const newMeals = [...templateForm.meals];
    newMeals[mealIndex] = {
      ...newMeals[mealIndex],
      [field]: value
    };
    setTemplateForm(prev => ({
      ...prev,
      meals: newMeals
    }));
  };

  const handleMealItemChange = (mealIndex, itemIndex, field, value) => {
    const newMeals = [...templateForm.meals];
    newMeals[mealIndex].items[itemIndex] = {
      ...newMeals[mealIndex].items[itemIndex],
      [field]: value
    };
    setTemplateForm(prev => ({
      ...prev,
      meals: newMeals
    }));
  };

  const addMeal = () => {
    setTemplateForm(prev => ({
      ...prev,
      meals: [...prev.meals, {
        meal_type: 'Snack',
        time: '',
        items: [{
          food_name: '',
          quantity: '',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          notes: ''
        }]
      }]
    }));
  };

  const removeMeal = (mealIndex) => {
    setTemplateForm(prev => ({
      ...prev,
      meals: prev.meals.filter((_, i) => i !== mealIndex)
    }));
  };

  const addMealItem = (mealIndex) => {
    const newMeals = [...templateForm.meals];
    newMeals[mealIndex].items.push({
      food_name: '',
      quantity: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      notes: ''
    });
    setTemplateForm(prev => ({
      ...prev,
      meals: newMeals
    }));
  };

  const removeMealItem = (mealIndex, itemIndex) => {
    const newMeals = [...templateForm.meals];
    newMeals[mealIndex].items = newMeals[mealIndex].items.filter((_, i) => i !== itemIndex);
    setTemplateForm(prev => ({
      ...prev,
      meals: newMeals
    }));
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      goal: '',
      total_calories: '',
      protein_target: '',
      carbs_target: '',
      fat_target: '',
      meals: [{
        meal_type: 'Breakfast',
        time: '',
        items: [{
          food_name: '',
          quantity: '',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          notes: ''
        }]
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
        total_calories: templateForm.total_calories ? parseInt(templateForm.total_calories) : null,
        protein_target: templateForm.protein_target ? parseFloat(templateForm.protein_target) : null,
        carbs_target: templateForm.carbs_target ? parseFloat(templateForm.carbs_target) : null,
        fat_target: templateForm.fat_target ? parseFloat(templateForm.fat_target) : null,
        meals: templateForm.meals.map(meal => ({
          ...meal,
          items: meal.items.filter(item => item.food_name.trim() !== '').map(item => ({
            ...item,
            calories: item.calories ? parseInt(item.calories) : null,
            protein: item.protein ? parseFloat(item.protein) : null,
            carbs: item.carbs ? parseFloat(item.carbs) : null,
            fat: item.fat ? parseFloat(item.fat) : null
          }))
        })).filter(meal => meal.items.length > 0)
      };

      if (editingTemplate) {
        await axios.put(`${API}/diet-templates/${editingTemplate.id}`, submitData);
        alert('Diet template updated successfully!');
      } else {
        await axios.post(`${API}/diet-templates`, submitData);
        alert('Diet template created successfully!');
      }
      
      resetTemplateForm();
      setShowTemplateForm(false);
      fetchDietTemplates();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save diet template');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setTemplateForm({
      name: template.name,
      description: template.description,
      goal: template.goal,
      total_calories: template.total_calories?.toString() || '',
      protein_target: template.protein_target?.toString() || '',
      carbs_target: template.carbs_target?.toString() || '',
      fat_target: template.fat_target?.toString() || '',
      meals: template.meals.length > 0 ? template.meals : [{
        meal_type: 'Breakfast',
        time: '',
        items: [{
          food_name: '',
          quantity: '',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          notes: ''
        }]
      }]
    });
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this diet template?')) {
      try {
        await axios.delete(`${API}/diet-templates/${templateId}`);
        alert('Diet template deleted successfully!');
        fetchDietTemplates();
      } catch (error) {
        alert(error.response?.data?.detail || 'Failed to delete diet template');
      }
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/plan-assignments`, {
        ...assignForm,
        plan_type: 'diet',
        start_date: assignForm.start_date ? new Date(assignForm.start_date).toISOString() : null,
        end_date: assignForm.end_date ? new Date(assignForm.end_date).toISOString() : null
      });
      
      alert('Diet plan assigned successfully!');
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
      alert(error.response?.data?.detail || 'Failed to assign diet plan');
    } finally {
      setLoading(false);
    }
  };

  const getGoalColor = (goal) => {
    switch (goal) {
      case 'Weight Loss': return 'bg-red-100 text-red-800';
      case 'Muscle Gain': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-blue-100 text-blue-800';
      case 'Cutting': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && dietTemplates.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Diet Plans</h1>
          <p className="text-gray-600">Create diet templates and assign them to members</p>
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
          Templates ({dietTemplates.length})
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
          {dietTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dietTemplates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalColor(template.goal)}`}>
                      {template.goal}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{template.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {template.total_calories && (
                      <div className="text-sm text-gray-600">
                        <strong>Calories:</strong> {template.total_calories}
                      </div>
                    )}
                    {template.protein_target && (
                      <div className="text-sm text-gray-600">
                        <strong>Protein:</strong> {template.protein_target}g
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      <strong>Meals:</strong> {template.meals.length}
                    </div>
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
              <div className="text-gray-400 text-6xl mb-4">🥗</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No diet templates yet</h3>
              <p className="text-gray-600 mb-4">Create your first diet template to get started</p>
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
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Diet Plan</th>
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
                              if (window.confirm('Remove this diet plan assignment?')) {
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
              <p className="text-gray-600 mb-4">Start assigning diet plans to your members</p>
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
                  {editingTemplate ? 'Edit Diet Template' : 'Create Diet Template'}
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
                      Goal
                    </label>
                    <select
                      name="goal"
                      value={templateForm.goal}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select goal</option>
                      {goalTypes.map(goal => (
                        <option key={goal} value={goal}>{goal}</option>
                      ))}
                    </select>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Calories
                    </label>
                    <input
                      type="number"
                      name="total_calories"
                      value={templateForm.total_calories}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      name="protein_target"
                      value={templateForm.protein_target}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      name="carbs_target"
                      value={templateForm.carbs_target}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      name="fat_target"
                      value={templateForm.fat_target}
                      onChange={handleTemplateInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Meals */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meals
                  </label>
                  {templateForm.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="border border-gray-200 rounded-md p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Meal {mealIndex + 1}</h4>
                        {templateForm.meals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMeal(mealIndex)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove Meal
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div>
                          <select
                            value={meal.meal_type}
                            onChange={(e) => handleMealChange(mealIndex, 'meal_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {mealTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="time"
                            value={meal.time}
                            onChange={(e) => handleMealChange(mealIndex, 'time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Meal Items */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-800">Food Items</h5>
                        {meal.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="bg-gray-50 p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Item {itemIndex + 1}</span>
                              {meal.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMealItem(mealIndex, itemIndex)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={item.food_name}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'food_name', e.target.value)}
                                placeholder="Food name"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'quantity', e.target.value)}
                                placeholder="Quantity"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                value={item.calories}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'calories', e.target.value)}
                                placeholder="Calories"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                step="0.1"
                                value={item.protein}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'protein', e.target.value)}
                                placeholder="Protein (g)"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                step="0.1"
                                value={item.carbs}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'carbs', e.target.value)}
                                placeholder="Carbs (g)"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                step="0.1"
                                value={item.fat}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'fat', e.target.value)}
                                placeholder="Fat (g)"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="mt-2">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => handleMealItemChange(mealIndex, itemIndex, 'notes', e.target.value)}
                                placeholder="Notes"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => addMealItem(mealIndex)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          + Add Food Item
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addMeal}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    + Add Meal
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
                <h2 className="text-xl font-bold text-gray-900">Assign Diet Plan</h2>
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
                    Select Diet Plan
                  </label>
                  <select
                    value={assignForm.plan_id}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, plan_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a diet plan</option>
                    {dietTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.goal})
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
                    placeholder="Any specific dietary instructions or notes..."
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

export default DietPlans;