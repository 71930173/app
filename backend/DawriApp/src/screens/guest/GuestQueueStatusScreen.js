import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme, statusColors } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { guestAPI } from '../../services/api';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';

const GuestQueueStatusScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { appointmentId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await guestAPI.getQueueStatus(appointmentId); setData(res.data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [appointmentId]);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const handleCancel = async () => {
    try { await guestAPI.cancelAppointment(appointmentId); Toast.show({ type: 'success', text1: 'Cancelled' }); navigation.navigate('GuestDashboard'); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error' }); }
  };

  if (loading) return <Loading />;
  if (!data) return <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: theme.text }}>No data</Text></View>;

  const sc = statusColors[data.status] || theme.primary;
  const isWaiting = data.status === 'waiting';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <View style={[styles.ticketCard, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{t('ticketNumber')}</Text>
          <Text style={{ color: theme.primary, fontSize: 48, fontWeight: 'bold' }}>#{data.ticket_number}</Text>
          <View style={[styles.badge, { backgroundColor: sc + '20' }]}><Text style={[styles.badgeText, { color: sc }]}>{data.status?.toUpperCase()}</Text></View>
        </View>
        <View style={styles.row}>
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
        {data.status === 'serving' && (
          <View style={[styles.banner, { backgroundColor: theme.secondary + '20' }]}>
            <Text style={{ color: theme.secondary, fontSize: 24, fontWeight: 'bold' }}>{t('yourTurn')}</Text>
          </View>
        )}
        {isWaiting && (
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.danger }]} onPress={handleCancel}><Text style={styles.btnText}>{t('cancelAppointment')}</Text></TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 20 }, back: { marginBottom: 16, width: 40, height: 40 },
  ticketCard: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  badge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 }, badgeText: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', marginBottom: 16 },
  infoCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', marginRight: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 16 }, banner: { padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  cancelBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' }, btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default GuestQueueStatusScreen;
