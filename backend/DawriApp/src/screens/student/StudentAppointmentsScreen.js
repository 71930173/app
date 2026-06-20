import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme, statusColors } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { studentAPI } from '../../services/api';
import { formatDate, getStatusDisplay } from '../../utils/helpers';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const StudentAppointmentsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await studentAPI.getMyAppointments(); setAppts(res.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('appointmentHistory')}</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {appts.length === 0 ? <EmptyState title="No Appointments" message="No appointments yet" /> : appts.map((a) => {
          const sc = statusColors[a.status] || theme.primary;
          const name = lang === 'ar' && a.issue_type_name_ar ? a.issue_type_name_ar : a.issue_type_name;
          return (
            <TouchableOpacity key={a.id} style={[styles.card, { backgroundColor: theme.surface }]} onPress={() => { if (a.status === 'waiting' || a.status === 'serving') navigation.navigate('StudentQueueStatus', { appointmentId: a.id }); }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={[styles.badge, { backgroundColor: sc + '20' }]}><Text style={[styles.badgeText, { color: sc }]}>{getStatusDisplay(a.status, t)}</Text></View>
                <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>#{a.ticket_number}</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 14 }}>{name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>{a.staff_name}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{formatDate(a.created_at, lang)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { marginBottom: 12, width: 40, height: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 16 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});

export default StudentAppointmentsScreen;
