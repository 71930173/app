import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../services/api';
import InputField from '../../components/InputField';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';

const StudentProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  useEffect(() => {
    studentAPI.getProfile().then((res) => {
      const d = res.data;
      setProfile(d);
      setForm({ first_name: d.first_name || '', last_name: d.last_name || '', email: d.email || '', phone: d.phone || '' });
    }).catch(() => Toast.show({ type: 'error', text1: 'Error' })).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await studentAPI.updateProfile(form);
      updateUser({ firstName: form.first_name, first_name: form.first_name, lastName: form.last_name, last_name: form.last_name, email: form.email });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      setEditing(false);
      const res = await studentAPI.getProfile(); setProfile(res.data);
    } catch (e) { Toast.show({ type: 'error', text1: 'Failed to update' }); }
    finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  const fields = [
    { label: t('firstName'), value: profile?.first_name },
    { label: t('lastName'), value: profile?.last_name },
    { label: t('email'), value: profile?.email },
    { label: t('phone'), value: profile?.phone || 'Not set' },
    { label: t('studentId'), value: profile?.student_id },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile')}</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)}><Text style={{ color: theme.primary, fontWeight: '600' }}>{editing ? 'Cancel' : 'Edit'}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}><Text style={styles.avatarText}>{(form.first_name || 'S')[0]}</Text></View>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '600' }}>{form.first_name} {form.last_name}</Text>
        </View>
        {editing ? (
          <View>
            <InputField label={t('firstName')} value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
            <InputField label={t('lastName')} value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
            <InputField label={t('email')} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
            <InputField label={t('phone')} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}><Text style={styles.btnText}>{saving ? t('loading') : t('save')}</Text></TouchableOpacity>
          </View>
        ) : (
          fields.map((f, i) => (
            <View key={i} style={[styles.row, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{f.label}</Text>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{f.value}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 40, height: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default StudentProfileScreen;
