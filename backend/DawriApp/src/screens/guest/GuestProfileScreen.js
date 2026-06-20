import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { guestAPI } from '../../services/api';
import InputField from '../../components/InputField';
import Loading from '../../components/Loading';
import Toast from 'react-native-toast-message';

const GuestProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', contact_value: '' });

  useEffect(() => {
    guestAPI.getProfile().then((res) => { const d = res.data; setProfile(d); setForm({ first_name: d.first_name || '', last_name: d.last_name || '', contact_value: d.contact_value || '' }); }).catch(() => Toast.show({ type: 'error', text1: 'Error' })).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await guestAPI.updateProfile(form); updateUser({ firstName: form.first_name, first_name: form.first_name }); Toast.show({ type: 'success', text1: 'Saved' }); setEditing(false); guestAPI.getProfile().then((res) => setProfile(res.data)); }
    catch (e) { Toast.show({ type: 'error', text1: 'Error' }); }
    finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile')}</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)}><Text style={{ color: theme.primary, fontWeight: '600' }}>{editing ? 'Cancel' : 'Edit'}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={[styles.avatar, { backgroundColor: theme.secondary }]}><Text style={styles.avatarText}>{(form.first_name || 'G')[0]}</Text></View>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '600' }}>{form.first_name} {form.last_name}</Text>
        </View>
        {editing ? (
          <View>
            <InputField label={t('firstName')} value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
            <InputField label={t('lastName')} value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}><Text style={styles.btnText}>{saving ? t('loading') : t('save')}</Text></TouchableOpacity>
          </View>
        ) : (
          [{ label: t('firstName'), value: profile?.first_name }, { label: t('lastName'), value: profile?.last_name }, { label: t('contactValue'), value: profile?.contact_value }].map((f, i) => (
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
  container: { flex: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { width: 40, height: 40 }, headerTitle: { fontSize: 20, fontWeight: 'bold' }, scroll: { padding: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 }, btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default GuestProfileScreen;
