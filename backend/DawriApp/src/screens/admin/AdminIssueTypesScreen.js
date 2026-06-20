import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { adminAPI } from '../../services/api';
import InputField from '../../components/InputField';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Toast from 'react-native-toast-message';

const colorOptions = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#64748b'];

const AdminIssueTypesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', description: '', color: '#2563eb' });

  const resetForm = () => { setForm({ name: '', nameAr: '', description: '', color: '#2563eb' }); setEditingId(null); };
  const load = useCallback(async () => {
    try { const res = await adminAPI.getIssueTypes(); setIssues(res.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (it) => { setForm({ name: it.name || '', nameAr: it.name_ar || '', description: it.description || '', color: it.color || '#2563eb' }); setEditingId(it.id); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name || !form.nameAr) { Toast.show({ type: 'warning', text1: 'Name (EN) and Name (AR) required' }); return; }
    setSubmitting(true);
    try {
      const data = { name: form.name, nameAr: form.nameAr, description: form.description || null, color: form.color, icon: 'FaQuestionCircle' };
      if (editingId) { await adminAPI.updateIssueType(editingId, data); Toast.show({ type: 'success', text1: 'Updated' }); }
      else { await adminAPI.createIssueType(data); Toast.show({ type: 'success', text1: 'Created' }); }
      setShowModal(false); resetForm(); load();
    } catch (e) { Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.error || 'Failed' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', t('deleteIssueTypeConfirm'), [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await adminAPI.deleteIssueType(id); Toast.show({ type: 'success', text1: 'Deleted' }); load(); } catch (e) { Toast.show({ type: 'error', text1: 'Error' }); } } }]);
  };

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('manageIssueTypes')}</Text>
        <TouchableOpacity onPress={openAdd}><Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>+ Add</Text></TouchableOpacity>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {issues.length === 0 ? <EmptyState title="No Issue Types" message="No issue types found" /> : issues.map((it) => (
          <View key={it.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dot, { backgroundColor: it.color || '#2563eb' }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{it.name}</Text>
                {it.name_ar && <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{it.name_ar}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => openEdit(it)}><Text style={{ color: theme.primary, fontSize: 13 }}>Edit</Text></TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.danger + '15' }]} onPress={() => handleDelete(it.id)}><Text style={{ color: theme.danger, fontSize: 13 }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{editingId ? t('editIssueType') : t('addIssueType')}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}><Text style={{ color: theme.text, fontSize: 20 }}>&times;</Text></TouchableOpacity>
            </View>
            <InputField label="Name (EN) *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <InputField label={t('nameAr') + ' *'} value={form.nameAr} onChangeText={(v) => setForm({ ...form, nameAr: v })} />
            <InputField label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 8 }}>{t('color')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {colorOptions.map((c) => (
                <TouchableOpacity key={c} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, margin: 4, borderWidth: form.color === c ? 3 : 0, borderColor: '#000' }} onPress={() => setForm({ ...form, color: c })} />
              ))}
            </View>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}><Text style={styles.btnText}>{submitting ? t('loading') : (editingId ? t('save') : t('addIssueType'))}</Text></TouchableOpacity>
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
  dot: { width: 16, height: 16, borderRadius: 8 }, actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' }, modalContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 }, btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default AdminIssueTypesScreen;
