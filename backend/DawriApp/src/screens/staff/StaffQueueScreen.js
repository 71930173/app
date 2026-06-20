import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { useTheme, statusColors } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { staffAPI } from '../../services/api';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Toast from 'react-native-toast-message';

const StaffQueueScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [servingNext, setServingNext] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [selected, setSelected] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [resolveNote, setResolveNote] = useState('');

  const load = useCallback(async () => {
    try { const res = await staffAPI.getMyQueue(); setQueue(res.data?.queue || []); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleServeNext = async () => {
    setServingNext(true);
    try { await staffAPI.serveNext(); Toast.show({ type: 'success', text1: 'Serving next' }); load(); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed' }); }
    finally { setServingNext(false); }
  };

  const handleMarkServed = async (id) => {
    try { await staffAPI.markServed(id); Toast.show({ type: 'success', text1: 'Marked as served' }); load(); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error' }); }
  };

  const handleCancel = async () => {
    if (!selected) return;
    try { await staffAPI.cancelAppointment(selected.id, cancelReason); setShowCancel(false); setCancelReason(''); Toast.show({ type: 'success', text1: 'Cancelled' }); load(); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error' }); }
  };

  const handleResolve = async () => {
    if (!selected) return;
    try { await staffAPI.resolveRemotely(selected.id, resolveNote); setShowResolve(false); setResolveNote(''); Toast.show({ type: 'success', text1: 'Resolved' }); load(); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error' }); }
  };

  if (loading) return <Loading />;

  const serving = queue.filter((q) => q.status === 'serving');
  const waiting = queue.filter((q) => q.status === 'waiting');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('currentQueue')}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{waiting.length} {t('waiting')}</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {serving.length === 0 && waiting.length > 0 && (
          <TouchableOpacity style={[styles.serveBtn, { backgroundColor: theme.primary }]} onPress={handleServeNext} disabled={servingNext}>
            <Text style={styles.btnText}>{servingNext ? t('loading') : t('serveNext')}</Text>
          </TouchableOpacity>
        )}
        {serving.map((s) => (
          <View key={s.id} style={[styles.servingCard, { borderColor: theme.secondary, backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.secondary, fontSize: 16, fontWeight: '600' }}>{t('servingNow')}</Text>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: 'bold', marginVertical: 4 }}>#{s.ticket_number}</Text>
            <Text style={{ color: theme.text, fontSize: 15 }}>{s.user_first_name} {s.user_last_name}</Text>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.secondary }]} onPress={() => handleMarkServed(s.id)}><Text style={styles.btnText}>{t('markAsServed')}</Text></TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.info }]} onPress={() => { setSelected(s); setShowResolve(true); }}><Text style={styles.btnText}>{t('resolveRemotely')}</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>{t('waitingList')}</Text>
        {waiting.length === 0 ? <EmptyState title="No one waiting" message={t('noPeopleInQueue')} /> : waiting.map((w, idx) => (
          <View key={w.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', width: 30 }}>#{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '500' }}>{w.user_first_name} {w.user_last_name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Ticket #{w.ticket_number}</Text>
              </View>
              {w.is_guest_priority === 1 && <Text style={{ color: theme.warning, fontSize: 11 }}>{t('guestPriority')}</Text>}
            </View>
            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8 }} onPress={() => { setSelected(w); setShowCancel(true); }}>
              <Text style={{ color: theme.danger, fontSize: 12 }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCancel} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('cancelAppointment')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Reason (optional)" placeholderTextColor={theme.textMuted} value={cancelReason} onChangeText={setCancelReason} />
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border, marginRight: 8 }]} onPress={() => setShowCancel(false)}><Text style={{ color: theme.text }}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.danger }]} onPress={handleCancel}><Text style={{ color: '#ffffff' }}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showResolve} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('resolveRemotely')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder={t('enterResolutionNote')} placeholderTextColor={theme.textMuted} value={resolveNote} onChangeText={setResolveNote} multiline numberOfLines={3} />
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border, marginRight: 8 }]} onPress={() => setShowResolve(false)}><Text style={{ color: theme.text }}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.secondary }]} onPress={handleResolve}><Text style={{ color: '#ffffff' }}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { marginBottom: 12, width: 40, height: 40 }, headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 16 }, serveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' }, servingCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }, card: { padding: 14, borderRadius: 14, marginBottom: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' }, modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 50, textAlignVertical: 'top', marginBottom: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});

export default StaffQueueScreen;
