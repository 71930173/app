import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme, statusColors } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../services/api';
import { getStatusDisplay } from '../../utils/helpers';
import Loading from '../../components/Loading';

const StudentDashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  const [activeAppt, setActiveAppt] = useState(null);
  const [stats, setStats] = useState({ totalVisits: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const apptRes = await studentAPI.getActiveAppointment();
      setActiveAppt(apptRes.data);
      const apptsRes = await studentAPI.getMyAppointments();
      const appts = apptsRes.data || [];
      setStats({ totalVisits: appts.length, completed: appts.filter((a) => a.status === 'served').length });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const menuItems = [
    { title: t('createNewAppointment'), color: theme.primary, screen: 'StudentIssueSelection' },
    { title: t('myAppointments'), color: theme.secondary, screen: 'StudentAppointments' },
    { title: t('notifications'), color: theme.warning, screen: 'StudentNotifications' },
    { title: t('profile'), color: theme.info, screen: 'StudentProfile' },
    { title: t('settings'), color: theme.textSecondary, screen: 'StudentSettings' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{(user?.firstName || user?.first_name || 'S')[0]}</Text>
            </View>
            <View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('welcome')},</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>{user?.firstName || user?.first_name || 'Student'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout}><Text style={{ color: theme.danger, fontSize: 14 }}>{t('logout')}</Text></TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.totalVisits}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('totalVisits')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.statValue, { color: theme.secondary }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('completed')}</Text>
          </View>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {activeAppt ? (
          <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate('StudentQueueStatus', { appointmentId: activeAppt.id })}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, { backgroundColor: (statusColors[activeAppt.status] || theme.primary) + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColors[activeAppt.status] || theme.primary }]}>{getStatusDisplay(activeAppt.status, t)}</Text>
              </View>
              <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>#{activeAppt.ticket_number}</Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 16 }}>{activeAppt.issue_type_name}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{t('estimatedWait')}: {activeAppt.estimated_wait_minutes || 0} {t('minutes')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface, alignItems: 'center' }]} onPress={() => navigation.navigate('StudentIssueSelection')}>
            <Text style={{ color: theme.primary, fontSize: 40 }}>+</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{t('noActiveAppointment')}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t('createAppointmentPrompt')}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.menuRow}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuItem, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate(item.screen)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Text style={[styles.menuIconText, { color: item.color }]}>{item.title[0]}</Text>
              </View>
              <Text style={[styles.menuText, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row' },
  statBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2 },
  scroll: { padding: 16 },
  card: { padding: 16, borderRadius: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  menuRow: { flexDirection: 'row', flexWrap: 'wrap' },
  menuItem: { width: '30%', flex: 1, minWidth: 90, padding: 14, borderRadius: 16, alignItems: 'center', margin: 4 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  menuIconText: { fontSize: 18, fontWeight: 'bold' },
  menuText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});

export default StudentDashboardScreen;
