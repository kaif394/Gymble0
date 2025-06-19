import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const MemberRegistration = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [gyms, setGyms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gym_id: '',
    plan_id: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchGyms();
  }, []);

  useEffect(() => {
    if (formData.gym_id) {
      fetchPlansForGym(formData.gym_id);
    }
  }, [formData.gym_id]);

  const fetchGyms = async () => {
    try {
      const response = await axios.get(`${API}/gyms/all`);
      setGyms(response.data);
    } catch (error) {
      console.error('Error fetching gyms:', error);
    }
  };

  const fetchPlansForGym = async (gymId) => {
    try {
      const response = await axios.get(`${API}/plans/gym/${gymId}`);
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.gym_id) newErrors.gym_id = 'Please select a gym';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    
    if (!formData.plan_id) newErrors.plan_id = 'Please select a membership plan';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/register-member`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        gym_id: formData.gym_id,
        plan_id: formData.plan_id
      });
      
      alert('Registration successful! You can now login to your account.');
      onComplete();
    } catch (error) {
      alert(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedGym = gyms.find(gym => gym.id === formData.gym_id);
  const selectedPlan = plans.find(plan => plan.id === formData.plan_id);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">Step {step} of 3</span>
          <span className="text-sm text-gray-600">
            {step === 1 && 'Personal Information'}
            {step === 2 && 'Choose Gym'}
            {step === 3 && 'Select Plan'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step 1: Personal Information */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Personal Information</h2>
            <p className="text-gray-600">Let's start with your basic details</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your phone number"
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Create a password"
              />
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Choose Gym */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Your Gym</h2>
            <p className="text-gray-600">Select the gym you want to join</p>
          </div>
          
          {errors.gym_id && <p className="text-red-600 text-sm">{errors.gym_id}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gyms.map((gym) => (
              <div
                key={gym.id}
                onClick={() => handleInputChange({ target: { name: 'gym_id', value: gym.id } })}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.gym_id === gym.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{gym.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{gym.address}</p>
                <div className="text-sm text-gray-500">
                  <p>📞 {gym.phone}</p>
                  <p>📧 {gym.email}</p>
                </div>
                {gym.description && (
                  <p className="text-sm text-gray-600 mt-2">{gym.description}</p>
                )}
              </div>
            ))}
          </div>
          
          {gyms.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No gyms available at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Select Plan */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select Membership Plan</h2>
            <p className="text-gray-600">
              Choose a membership plan for <strong>{selectedGym?.name}</strong>
            </p>
          </div>
          
          {errors.plan_id && <p className="text-red-600 text-sm">{errors.plan_id}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handleInputChange({ target: { name: 'plan_id', value: plan.id } })}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.plan_id === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {plan.plan_type.toUpperCase()}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="text-2xl font-bold text-gray-900">₹{plan.price}</div>
                  <div className="text-sm text-gray-600">{plan.duration_days} days</div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                
                {plan.features.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-gray-500">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {plans.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No plans available for this gym.</p>
            </div>
          )}

          {/* Summary */}
          {selectedPlan && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Registration Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Gym:</strong> {selectedGym?.name}</p>
                <p><strong>Plan:</strong> {selectedPlan.name} - ₹{selectedPlan.price} ({selectedPlan.duration_days} days)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : onComplete()}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {step === 1 ? 'Back to Login' : 'Previous'}
        </button>
        
        <button
          onClick={handleNext}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Registering...
            </div>
          ) : (
            step === 3 ? 'Complete Registration' : 'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default MemberRegistration;