import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { adminAPI } from '../../services/api';
import InputField from '../../components/InputField';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Toast from 'react-native-toast-message';

const AdminStaffManagementScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', roomNumber: '', block: '', floor: '' });

  const resetForm = () => { setForm({ firstName: '', lastName: '', email: '', password: '', roomNumber: '', block: '', floor: '' }); setEditingId(null); };
  const load = useCallback(async () => {
    try { const res = await adminAPI.getAllStaff(); setStaff(res.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (s) => { setForm({ firstName: s.first_name || '', lastName: s.last_name || '', email: s.email || '', password: '', roomNumber: s.room_number || '', block: s.block || '', floor: s.floor || '' }); setEditingId(s.id); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email || (!editingId && !form.password)) { Toast.show({ type: 'warning', text1: 'Fill all required fields' }); return; }
    setSubmitting(true);
    try {
      const data = { firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password || undefined, roomNumber: form.roomNumber, block: form.block, floor: form.floor, maxQueueLimit: 20 };
      if (editingId) { await adminAPI.updateStaff(editingId, data); Toast.show({ type: 'success', text1: 'Updated' }); }
      else { await adminAPI.createStaff(data); Toast.show({ type: 'success', text1: 'Created' }); }
      setShowModal(false); resetForm(); load();
    } catch (e) { Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.error || 'Failed' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', t('deleteStaffConfirm'), [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await adminAPI.deleteStaff(id); Toast.show({ type: 'success', text1: 'Deleted' }); load(); } catch (e) { Toast.show({ type: 'error', text1: 'Error' }); } } }]);
  };

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('manageStaff')}</Text>
        <TouchableOpacity onPress={openAdd}><Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>+ {t('addStaff')}</Text></TouchableOpacity>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {staff.length === 0 ? <EmptyState title="No Staff" message="No staff members found" /> : staff.map((s) => (
          <View key={s.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}><Text style={styles.avatarText}>{(s.first_name || 'S')[0]}{(s.last_name || '')[0]}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{s.first_name} {s.last_name}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{s.email}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{s.block}, {s.floor}, Room {s.room_number}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: s.is_available ? '#10b981' : '#ef4444' }]} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => openEdit(s)}><Text style={{ color: theme.primary, fontSize: 13 }}>Edit</Text></TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.danger + '15' }]} onPress={() => handleDelete(s.id)}><Text style={{ color: theme.danger, fontSize: 13 }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{editingId ? t('editStaff') : t('addStaff')}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><Text style={{ color: theme.text, fontSize: 20 }}>&times;</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{ flexDirection: 'row', marginRight: -6 }}>
                <View style={{ flex: 1, marginRight: 6 }}><InputField label={t('firstName')} value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} /></View>
                <View style={{ flex: 1, marginRight: 6 }}><InputField label={t('lastName')} value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} /></View>
              </View>
              <InputField label={t('email')} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
              {!editingId && <InputField label={t('password')} value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />}
              <View style={{ flexDirection: 'row', marginRight: -6 }}>
                <View style={{ flex: 1, marginRight: 6 }}><InputField label={t('roomNumber')} value={form.roomNumber} onChangeText={(v) => setForm({ ...form, roomNumber: v })} /></View>
                <View style={{ flex: 1, marginRight: 6 }}><InputField label={t('block')} value={form.block} onChangeText={(v) => setForm({ ...form, block: v })} /></View>
              </View>
              <InputField label={t('floor')} value={form.floor} onChangeText={(v) => setForm({ ...form, floor: v })} />
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}><Text style={styles.btnText}>{submitting ? t('loading') : (editingId ? t('save') : t('addStaff'))}</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { width: 40, height: 40 }, headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 16 }, card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }, statusDot: { width: 12, height: 12, borderRadius: 6 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' }, modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 }, btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default AdminStaffManagementScreen;
