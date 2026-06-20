import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const HomeScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const userTypes = [
    { title: t('studentLogin'), icon: 'S', color: '#2563eb', screen: 'StudentLogin', desc: 'University students' },
    { title: t('guestLogin'), icon: 'G', color: '#10b981', screen: 'GuestLogin', desc: 'Guests & Visitors' },
    { title: t('staffLogin'), icon: 'T', color: '#f59e0b', screen: 'StaffLogin', desc: 'Staff members' },
    { title: t('adminLogin'), icon: 'A', color: '#8b5cf6', screen: 'AdminLogin', desc: 'Administrators' },
  ];

  return (
    <LinearGradient
      colors={isDarkMode ? ['#0f172a', '#1e293b'] : ['#f8fafc', '#e2e8f0']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>{t('appName')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('appSubtitle')}</Text>
        </View>

        {userTypes.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.card, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
              <Text style={[styles.iconText, { color: item.color }]}>{item.icon}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
            </View>
            <Text style={[styles.arrow, { color: theme.textMuted }]}>&rsaquo;</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.footer, { color: theme.textMuted }]}>Dawri v2.0</Text>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardBody: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
    fontSize: 13,
  },
});

export default HomeScreen;
