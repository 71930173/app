import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';

import HomeScreen from './src/screens/HomeScreen';

import StudentLoginScreen from './src/screens/student/StudentLoginScreen';
import StudentSignupScreen from './src/screens/student/StudentSignupScreen';
import StudentDashboardScreen from './src/screens/student/StudentDashboardScreen';
import StudentIssueSelectionScreen from './src/screens/student/StudentIssueSelectionScreen';
import StudentStaffSelectionScreen from './src/screens/student/StudentStaffSelectionScreen';
import StudentQueueStatusScreen from './src/screens/student/StudentQueueStatusScreen';
import StudentAppointmentsScreen from './src/screens/student/StudentAppointmentsScreen';
import StudentNotificationsScreen from './src/screens/student/StudentNotificationsScreen';
import StudentProfileScreen from './src/screens/student/StudentProfileScreen';
import StudentSettingsScreen from './src/screens/student/StudentSettingsScreen';

import GuestLoginScreen from './src/screens/guest/GuestLoginScreen';
import GuestSignupScreen from './src/screens/guest/GuestSignupScreen';
import GuestDashboardScreen from './src/screens/guest/GuestDashboardScreen';
import GuestIssueSelectionScreen from './src/screens/guest/GuestIssueSelectionScreen';
import GuestStaffSelectionScreen from './src/screens/guest/GuestStaffSelectionScreen';
import GuestQueueStatusScreen from './src/screens/guest/GuestQueueStatusScreen';
import GuestAppointmentsScreen from './src/screens/guest/GuestAppointmentsScreen';
import GuestNotificationsScreen from './src/screens/guest/GuestNotificationsScreen';
import GuestProfileScreen from './src/screens/guest/GuestProfileScreen';
import GuestSettingsScreen from './src/screens/guest/GuestSettingsScreen';

import StaffLoginScreen from './src/screens/staff/StaffLoginScreen';
import StaffDashboardScreen from './src/screens/staff/StaffDashboardScreen';
import StaffQueueScreen from './src/screens/staff/StaffQueueScreen';
import StaffStatsScreen from './src/screens/staff/StaffStatsScreen';
import StaffSettingsScreen from './src/screens/staff/StaffSettingsScreen';

import AdminLoginScreen from './src/screens/admin/AdminLoginScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminStaffManagementScreen from './src/screens/admin/AdminStaffManagementScreen';
import AdminIssueTypesScreen from './src/screens/admin/AdminIssueTypesScreen';
import AdminAnalyticsScreen from './src/screens/admin/AdminAnalyticsScreen';
import AdminSettingsScreen from './src/screens/admin/AdminSettingsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isAuthenticated, userType, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
            <Stack.Screen name="StudentSignup" component={StudentSignupScreen} />
            <Stack.Screen name="GuestLogin" component={GuestLoginScreen} />
            <Stack.Screen name="GuestSignup" component={GuestSignupScreen} />
            <Stack.Screen name="StaffLogin" component={StaffLoginScreen} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
          </>
        ) : userType === 'student' ? (
          <>
            <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
            <Stack.Screen name="StudentIssueSelection" component={StudentIssueSelectionScreen} />
            <Stack.Screen name="StudentStaffSelection" component={StudentStaffSelectionScreen} />
            <Stack.Screen name="StudentQueueStatus" component={StudentQueueStatusScreen} />
            <Stack.Screen name="StudentAppointments" component={StudentAppointmentsScreen} />
            <Stack.Screen name="StudentNotifications" component={StudentNotificationsScreen} />
            <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
            <Stack.Screen name="StudentSettings" component={StudentSettingsScreen} />
          </>
        ) : userType === 'guest' ? (
          <>
            <Stack.Screen name="GuestDashboard" component={GuestDashboardScreen} />
            <Stack.Screen name="GuestIssueSelection" component={GuestIssueSelectionScreen} />
            <Stack.Screen name="GuestStaffSelection" component={GuestStaffSelectionScreen} />
            <Stack.Screen name="GuestQueueStatus" component={GuestQueueStatusScreen} />
            <Stack.Screen name="GuestAppointments" component={GuestAppointmentsScreen} />
            <Stack.Screen name="GuestNotifications" component={GuestNotificationsScreen} />
            <Stack.Screen name="GuestProfile" component={GuestProfileScreen} />
            <Stack.Screen name="GuestSettings" component={GuestSettingsScreen} />
          </>
        ) : userType === 'staff' ? (
          <>
            <Stack.Screen name="StaffDashboard" component={StaffDashboardScreen} />
            <Stack.Screen name="StaffQueue" component={StaffQueueScreen} />
            <Stack.Screen name="StaffStats" component={StaffStatsScreen} />
            <Stack.Screen name="StaffSettings" component={StaffSettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminStaffManagement" component={AdminStaffManagementScreen} />
            <Stack.Screen name="AdminIssueTypes" component={AdminIssueTypesScreen} />
            <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="auto" />
      <Toast />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
