import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { studentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';

const StudentStaffSelectionScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { issueTypeId, issueTypeName, issueTypeColor } = route.params;
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    studentAPI.getAvailableStaff(issueTypeId).then((res) => setStaff(res.data || [])).catch(() => Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load staff' })).finally(() => setLoading(false));
  }, [issueTypeId]);

  const handleCreate = async () => {
    if (!selected) { Toast.show({ type: 'warning', text1: 'Select a staff member' }); return; }
    setSubmitting(true);
    try {
      const res = await studentAPI.createAppointment({ staff_id: selected.id, issue_type_id: issueTypeId, description: desc });
      Toast.show({ type: 'success', text1: 'Success', text2: t('appointmentCreated') });
      navigation.navigate('StudentQueueStatus', { appointmentId: res.data.id });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.error || 'Failed' });
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('selectStaff')}</Text>
        <Text style={{ color: issueTypeColor, fontSize: 14 }}>{issueTypeName}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {staff.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}><Text style={{ color: theme.textSecondary, fontSize: 16 }}>{t('noStaffAvailable')}</Text></View>
        ) : (
          <>
            {staff.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.card, { backgroundColor: theme.surface, borderWidth: selected?.id === s.id ? 2 : 0, borderColor: theme.primary }]} onPress={() => setSelected(s)}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}><Text style={styles.avatarText}>{(s.first_name || 'S')[0]}{(s.last_name || '')[0]}</Text></View>
                <View style={styles.cardBody}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{s.first_name} {s.last_name}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{s.block}, {s.floor}, Room {s.room_number}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{s.current_queue || 0} {t('waiting').toLowerCase()} | ~{s.avg_service_time || 5} min</Text>
                </View>
                {selected?.id === s.id && <Text style={{ color: theme.primary, fontSize: 20 }}>&#10003;</Text>}
              </TouchableOpacity>
            ))}
            {selected && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 8 }}>{t('optionalDescription')}</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]} placeholder={t('optionalDescription')} placeholderTextColor={theme.textMuted} value={desc} onChangeText={setDesc} multiline numberOfLines={3} />
                <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, submitting && { opacity: 0.6 }]} onPress={handleCreate} disabled={submitting}>
                  <Text style={styles.btnText}>{submitting ? t('loading') : t('confirmAppointment')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  cardBody: { flex: 1, marginLeft: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default StudentStaffSelectionScreen;
