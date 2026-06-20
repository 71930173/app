import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import Toast from 'react-native-toast-message';

const GuestLoginScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [contactValue, setContactValue] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!contactValue.trim()) e.contactValue = 'Required';
    if (!password) e.password = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await login({ contactValue: contactValue.trim(), password }, 'guest');
    setLoading(false);
    if (!result.success) Toast.show({ type: 'error', text1: 'Login Failed', text2: result.error });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <View style={styles.header}>
          <View style={[styles.circle, { backgroundColor: theme.secondary }]}><Text style={styles.circleText}>G</Text></View>
          <Text style={[styles.title, { color: theme.text }]}>{t('guestLogin')}</Text>
        </View>
        <InputField label={t('contactValue')} placeholder={t('enterContactValue')} value={contactValue} onChangeText={(v) => { setContactValue(v); setErrors({ ...errors, contactValue: null }); }} error={errors.contactValue} />
        <InputField label={t('password')} placeholder={t('enterPassword')} value={password} onChangeText={(v) => { setPassword(v); setErrors({ ...errors, password: null }); }} secureTextEntry error={errors.password} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.secondary }, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}><Text style={styles.btnText}>{loading ? t('loading') : t('login')}</Text></TouchableOpacity>
        <Text style={[styles.link, { color: theme.textSecondary }]}>{t('noAccount')} <Text style={{ color: theme.primary, fontWeight: '600' }} onPress={() => navigation.navigate('GuestSignup')}>{t('signupHere')}</Text></Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 20 }, back: { marginTop: 20, marginBottom: 10, width: 40, height: 40 },
  header: { alignItems: 'center', marginBottom: 32 }, circle: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  circleText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' }, title: { fontSize: 24, fontWeight: 'bold' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 }, btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, textAlign: 'center', marginTop: 24 },
});

export default GuestLoginScreen;
