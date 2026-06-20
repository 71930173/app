import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import Loading from '../../components/Loading';

const AdminDashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ totalToday: 0, studentsToday: 0, avgWaitTime: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await adminAPI.getDashboardStats('day'); setStats(res.data || {}); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const menuItems = [
    { title: t('manageStaff'), color: theme.primary, screen: 'AdminStaffManagement' },
    { title: t('manageIssueTypes'), color: theme.secondary, screen: 'AdminIssueTypes' },
    { title: t('analytics'), color: theme.warning, screen: 'AdminAnalytics' },
    { title: t('settings'), color: theme.info, screen: 'AdminSettings' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#8b5cf6' }]}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.firstName || 'A')[0]}</Text></View>
            <View><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{t('welcome')},</Text><Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>{user?.firstName || user?.first_name || 'Admin'}</Text></View>
          </View>
          <TouchableOpacity onPress={logout}><Text style={{ color: '#ffffff', fontSize: 14 }}>{t('logout')}</Text></TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.totalToday || 0}</Text><Text style={styles.statLabel}>Total Today</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.studentsToday || 0}</Text><Text style={styles.statLabel}>Students</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.avgWaitTime || 0}m</Text><Text style={styles.statLabel}>Avg Wait</Text></View>
        </View>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        <View style={styles.menuRow}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuItem, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate(item.screen)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}><Text style={[styles.menuIconText, { color: item.color }]}>{item.title[0]}</Text></View>
              <Text style={[styles.menuText, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userInfo: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, statsRow: { flexDirection: 'row' },
  statBox: { flex: 1, padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', marginRight: 8 },
  statValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' }, statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  scroll: { padding: 16 }, menuRow: { flexDirection: 'row', flexWrap: 'wrap' },
  menuItem: { width: '47%', padding: 20, borderRadius: 16, alignItems: 'center', margin: 4 },
  menuIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  menuIconText: { fontSize: 18, fontWeight: 'bold' }, menuText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
});

export default AdminDashboardScreen;
