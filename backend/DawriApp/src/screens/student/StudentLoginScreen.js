import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import Toast from 'react-native-toast-message';

const StudentLoginScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { login } = useAuth();

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!studentId.trim()) newErrors.studentId = 'Student ID is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await login({ studentId: studentId.trim(), password }, 'student');
    setLoading(false);
    if (!result.success) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: result.error });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.circle, { backgroundColor: theme.primary }]}>
            <Text style={styles.circleText}>S</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{t('studentLogin')}</Text>
        </View>

        <InputField
          label={t('studentId')}
          placeholder={t('enterStudentId')}
          value={studentId}
          onChangeText={(text) => { setStudentId(text); setErrors({ ...errors, studentId: null }); }}
          error={errors.studentId}
        />

        <InputField
          label={t('password')}
          placeholder={t('enterPassword')}
          value={password}
          onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: null }); }}
          secureTextEntry
          error={errors.password}
        />

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: theme.primary }, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginBtnText}>{loading ? t('loading') : t('login')}</Text>
        </TouchableOpacity>

        <Text style={[styles.linkText, { color: theme.textSecondary }]}>
          {t('noAccount')}{' '}
          <Text style={{ color: theme.primary, fontWeight: '600' }} onPress={() => navigation.navigate('StudentSignup')}>
            {t('signupHere')}
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  backBtn: { marginTop: 20, marginBottom: 10, width: 40, height: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  circle: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  circleText: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold' },
  loginBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  linkText: { fontSize: 14, textAlign: 'center', marginTop: 24 },
});

export default StudentLoginScreen;
