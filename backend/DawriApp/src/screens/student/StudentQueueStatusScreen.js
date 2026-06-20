import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme, statusColors } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { studentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';

const StudentQueueStatusScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { appointmentId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try { const res = await studentAPI.getQueueStatus(appointmentId); setData(res.data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [appointmentId]);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const handleCancel = async () => {
    setCancelling(true);
    try { await studentAPI.cancelAppointment(appointmentId); Toast.show({ type: 'success', text1: 'Cancelled' }); navigation.navigate('StudentDashboard'); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to cancel' }); setCancelling(false); }
  };

  if (loading) return <Loading />;
  if (!data) return (
    <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: theme.text }}>No data</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.btn, { backgroundColor: theme.primary, marginTop: 16 }]}><Text style={styles.btnText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const sc = statusColors[data.status] || theme.primary;
  const isWaiting = data.status === 'waiting';
  const isServing = data.status === 'serving';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>

        <View style={[styles.ticketCard, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{t('ticketNumber')}</Text>
          <Text style={{ color: theme.primary, fontSize: 48, fontWeight: 'bold' }}>#{data.ticket_number}</Text>
          <View style={[styles.badge, { backgroundColor: sc + '20' }]}><Text style={[styles.badgeText, { color: sc }]}>{data.status?.toUpperCase()}</Text></View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>{data.people_before || 0}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{t('peopleBefore')}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>{data.estimated_wait_minutes || 0}m</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{t('estimatedWait')}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>{t('staffInfo').toUpperCase()}</Text>
          <Text style={{ color: theme.text, fontSize: 15 }}>{data.staff_name}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>{data.block}, {data.floor}, Room {data.room}</Text>
        </View>

        {isServing && (
          <View style={[styles.banner, { backgroundColor: theme.secondary + '20' }]}>
            <Text style={{ color: theme.secondary, fontSize: 24, fontWeight: 'bold' }}>{t('yourTurn')}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>Please proceed to the office</Text>
          </View>
        )}

        {isWaiting && (
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.danger }]} onPress={handleCancel} disabled={cancelling}>
            <Text style={styles.btnText}>{cancelling ? t('loading') : t('cancelAppointment')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  backBtn: { marginBottom: 16, width: 40, height: 40 },
  ticketCard: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  badge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', marginBottom: 16 },
  infoCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', marginRight: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 16 },
  banner: { padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', paddingHorizontal: 24 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default StudentQueueStatusScreen;
