import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import Toast from 'react-native-toast-message';

const GuestSignupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { signup } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', contactValue: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field, value) => { setForm((p) => ({ ...p, [field]: value })); setErrors((p) => ({ ...p, [field]: null })); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.contactValue.trim()) e.contactValue = 'Required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    const isEmail = form.contactValue.includes('@');
    const result = await signup({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      contactValue: form.contactValue.trim(), contactMethod: isEmail ? 'email' : 'phone',
      password: form.password, confirmPassword: form.confirmPassword,
    }, 'guest');
    setLoading(false);
    if (!result.success) Toast.show({ type: 'error', text1: 'Signup Failed', text2: result.error });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <View style={styles.header}>
          <View style={[styles.circle, { backgroundColor: theme.secondary }]}><Text style={styles.circleText}>+</Text></View>
          <Text style={[styles.title, { color: theme.text }]}>{t('guestSignup')}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.half}><InputField label={t('firstName')} placeholder="First" value={form.firstName} onChangeText={(v) => update('firstName', v)} error={errors.firstName} /></View>
          <View style={styles.half}><InputField label={t('lastName')} placeholder="Last" value={form.lastName} onChangeText={(v) => update('lastName', v)} error={errors.lastName} /></View>
        </View>
        <InputField label={t('contactValue')} placeholder={t('enterContactValue')} value={form.contactValue} onChangeText={(v) => update('contactValue', v)} error={errors.contactValue} />
        <InputField label={t('password')} placeholder={t('createPassword')} value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry error={errors.password} />
        <InputField label={t('confirmPassword')} placeholder={t('confirmYourPassword')} value={form.confirmPassword} onChangeText={(v) => update('confirmPassword', v)} secureTextEntry error={errors.confirmPassword} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.secondary }, loading && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading}><Text style={styles.btnText}>{loading ? t('loading') : t('signup')}</Text></TouchableOpacity>
        <Text style={[styles.link, { color: theme.textSecondary }]}>{t('haveAccount')} <Text style={{ color: theme.primary, fontWeight: '600' }} onPress={() => navigation.navigate('GuestLogin')}>{t('loginHere')}</Text></Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 20 }, back: { marginTop: 20, marginBottom: 10, width: 40, height: 40 },
  header: { alignItems: 'center', marginBottom: 24 }, circle: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  circleText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' }, title: { fontSize: 24, fontWeight: 'bold' },
  row: { flexDirection: 'row', marginRight: -6 }, half: { flex: 1, marginRight: 6 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 }, btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, textAlign: 'center', marginTop: 20, marginBottom: 20 },
});

export default GuestSignupScreen;
