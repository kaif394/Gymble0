import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../../config';
import { useNavigation } from '@react-navigation/native';

// Define types for the data we'll fetch
type MemberData = {
  id: string;
  name: string;
  email: string;
  gym_id: string;
  gym_name?: string;
};

type SubscriptionData = {
  id: string;
  plan_id: string;
  plan_name: string;
  start_date: string;
  duration_days: number;
};

type WorkoutPlan = {
  id: string;
  title: string;
  today_tasks_count: number;
};

type DietPlan = {
  id: string;
  title: string;
  today_meals_count: number;
};

export function Dashboard() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch all required data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Ensure we have a token
      if (!user?.token) {
        setError('Authentication token missing. Please log in again.');
        return;
      }

      // Create headers with token
      const headers = {
        Authorization: `Bearer ${user.token}`
      };
      
      // Fetch member data with explicit token
      const memberResponse = await axios.get(`${API_URL}/api/members/me`, { headers });
      setMemberData(memberResponse.data);
      
      if (memberResponse.data && memberResponse.data.id) {
        const memberId = memberResponse.data.id;
        
        // Fetch subscription data with explicit token and handle 404
        try {
          const subscriptionResponse = await axios.get(`${API_URL}/api/subscription/${memberId}`, { 
            headers,
            validateStatus: (status) => status === 200 || status === 404 // Accept 404 as valid response
          });
          
          if (subscriptionResponse.status === 200) {
            setSubscription(subscriptionResponse.data);
            
            // Calculate days left in subscription
            const startDate = new Date(subscriptionResponse.data.start_date);
            const durationDays = subscriptionResponse.data.duration_days;
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + durationDays);
            
            const today = new Date();
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysLeft(diffDays > 0 ? diffDays : 0);
          } else {
            // Handle 404 - no subscription found
            console.log('No subscription found for member');
            setSubscription(null);
            setDaysLeft(0);
          }
        } catch (subscriptionErr) {
          console.error('Error fetching subscription data:', subscriptionErr);
          // Don't set the main error - we can still show other data
        }
        
        // Fetch plans data with explicit token and handle 404
        try {
          // Changed from /api/plans/${memberId} to /api/plan-assignments/member/${memberId}
          const plansResponse = await axios.get(`${API_URL}/api/plan-assignments/member/${memberId}`, { 
            headers,
            validateStatus: (status) => status === 200 || status === 404 // Accept 404 as valid response
          });
          
          if (plansResponse.status === 200 && plansResponse.data && plansResponse.data.length > 0) {
            // Process workout plans
            const workoutAssignment = plansResponse.data.find(assignment => assignment.plan_type === 'workout');
            if (workoutAssignment) {
              setWorkoutPlan({
                id: workoutAssignment.plan_id,
                title: workoutAssignment.plan_name,
                today_tasks_count: 0 // Default value, could be updated with actual tasks if available
              });
            }
            
            // Process diet plans
            const dietAssignment = plansResponse.data.find(assignment => assignment.plan_type === 'diet');
            if (dietAssignment) {
              setDietPlan({
                id: dietAssignment.plan_id,
                title: dietAssignment.plan_name,
                today_meals_count: 0 // Default value, could be updated with actual meals if available
              });
            }
          } else {
            // Handle 404 or empty response - no plans found
            console.log('No plans found for member');
            setWorkoutPlan(null);
            setDietPlan(null);
          }
        } catch (plansErr) {
          console.error('Error fetching plans data:', plansErr);
          // Don't set the main error - we can still show other data
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [user]); // Add user as a dependency to refetch when user/token changes

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Handle quick action buttons
  const handleCheckInOut = () => {
    // Navigate to the CheckIn screen
    navigation.navigate('CheckIn');
  };

  const handleViewAnnouncements = () => {
    // Navigate to announcements screen
    console.log('View announcements pressed');
    // navigation.navigate('Announcements');
  };

  const handleMyPlans = () => {
    // Navigate to plans screen
    console.log('My plans pressed');
    // navigation.navigate('Plans');
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{memberData?.name || 'Member'}</Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Current Plan Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Plan</Text>
          <Text style={styles.cardValue}>{subscription?.plan_name || 'No active plan'}</Text>
          {subscription && (
            <Text style={styles.cardSubtext}>{subscription.duration_days} days duration</Text>
          )}
        </View>

        {/* Subscription Days Left Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <Text style={styles.cardValue}>{daysLeft} days left</Text>
          {subscription && (
            <Text style={styles.cardSubtext}>Started: {new Date(subscription.start_date).toLocaleDateString()}</Text>
          )}
        </View>

        {/* Workout Plan Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workout Plan</Text>
          <Text style={styles.cardValue}>{workoutPlan?.title || 'No workout plan'}</Text>
          {workoutPlan && (
            <Text style={styles.cardSubtext}>{workoutPlan.today_tasks_count} tasks today</Text>
          )}
        </View>

        {/* Diet Plan Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diet Plan</Text>
          <Text style={styles.cardValue}>{dietPlan?.title || 'No diet plan'}</Text>
          {dietPlan && (
            <Text style={styles.cardSubtext}>{dietPlan.today_meals_count} meals today</Text>
          )}
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCheckInOut}>
            <Text style={styles.actionButtonText}>Check-In/Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleViewAnnouncements}>
            <Text style={styles.actionButtonText}>View Announcements</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleMyPlans}>
            <Text style={styles.actionButtonText}>My Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cardsContainer: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});