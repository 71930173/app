import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const StudentSettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { t, lang, toggleLanguage } = useLanguage();
  const { logout } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle theme={theme} title={t('language')} />
        <SettingItem theme={theme} label={t('language')} value={lang === 'ar' ? t('arabic') : t('english')} onPress={toggleLanguage} />

        <SectionTitle theme={theme} title={t('theme')} />
        <SettingItem theme={theme} label={isDarkMode ? t('darkMode') : t('lightMode')} toggle value={isDarkMode} onValueChange={toggleDarkMode} />

        <SectionTitle theme={theme} title={t('about')} />
        <SettingItem theme={theme} label={t('version')} value="2.0.0" disabled />

        <TouchableOpacity style={[styles.logout, { backgroundColor: theme.danger + '15' }]} onPress={logout}>
          <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '600' }}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const SectionTitle = ({ theme, title }) => (
  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4, marginTop: 16 }}>{title}</Text>
);

const SettingItem = ({ theme, label, value, onPress, toggle, value: toggleVal, onValueChange, disabled }) => (
  <View style={[styles.item, { backgroundColor: theme.surface }, disabled && { opacity: 0.6 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
      <Text style={{ color: theme.text, fontSize: 15 }}>{label}</Text>
      {value && <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{value}</Text>}
      {toggle && <Switch value={toggleVal} onValueChange={onValueChange} trackColor={{ false: theme.border, true: theme.primary }} thumbColor="#ffffff" />}
      {!toggle && !value && !disabled && <Text style={{ color: theme.textMuted, fontSize: 18 }}>&rsaquo;</Text>}
    </View>
    {onPress && !disabled && !toggle && <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onPress} />}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { marginBottom: 12, width: 40, height: 40 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  scroll: { padding: 16 },
  item: { borderRadius: 16, marginBottom: 8, overflow: 'hidden' },
  logout: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16, marginBottom: 32 },
});

export default StudentSettingsScreen;
