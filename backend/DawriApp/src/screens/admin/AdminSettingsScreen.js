import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const AdminSettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { t, lang, toggleLanguage } = useLanguage();
  const { logout } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>{t('language')}</Text>
        <SettingRow theme={theme} label={t('language')} value={lang === 'ar' ? t('arabic') : t('english')} onPress={toggleLanguage} />
        <Text style={[styles.section, { marginTop: 16 }]}>{t('theme')}</Text>
        <SettingRow theme={theme} label={isDarkMode ? t('darkMode') : t('lightMode')} isSwitch value={isDarkMode} onValueChange={toggleDarkMode} />
        <Text style={[styles.section, { marginTop: 16 }]}>{t('about')}</Text>
        <View style={[styles.row, { backgroundColor: theme.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
            <Text style={{ color: theme.text, fontSize: 15 }}>{t('version')}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>2.0.0</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.logout, { backgroundColor: theme.danger + '15' }]} onPress={logout}><Text style={{ color: theme.danger, fontSize: 16, fontWeight: '600' }}>{t('logout')}</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const SettingRow = ({ theme, label, value, onPress, isSwitch, value: sv, onValueChange }) => (
  <View style={[styles.row, { backgroundColor: theme.surface }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
      <Text style={{ color: theme.text, fontSize: 15 }}>{label}</Text>
      {value && <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{value}</Text>}
      {isSwitch && <Switch value={sv} onValueChange={onValueChange} trackColor={{ false: theme.border, true: theme.primary }} thumbColor="#ffffff" />}
      {!isSwitch && !value && <Text style={{ color: theme.textMuted, fontSize: 18 }}>&rsaquo;</Text>}
    </View>
    {onPress && !isSwitch && <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onPress} />}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { marginBottom: 12, width: 40, height: 40 }, headerTitle: { fontSize: 22, fontWeight: 'bold' },
  scroll: { padding: 16 }, section: { color: '#64748b', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  row: { borderRadius: 16, marginBottom: 8, overflow: 'hidden' },
  logout: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16, marginBottom: 32 },
});

export default AdminSettingsScreen;
