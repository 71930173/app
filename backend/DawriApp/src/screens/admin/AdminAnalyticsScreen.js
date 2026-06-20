import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { adminAPI } from '../../services/api';
import Loading from '../../components/Loading';

const AdminAnalyticsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics(period).then((res) => setAnalytics(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <Loading />;

  const periods = [{ key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }];
  const sp = analytics?.staffPerformance || {};
  const names = sp.labels || [];
  const counts = sp.served || [];
  const maxCount = Math.max(...counts, 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('analytics')}</Text>
      </View>
      <View style={{ flexDirection: 'row', padding: 16 }}>
        {periods.map((p) => (
          <TouchableOpacity key={p.key} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: period === p.key ? theme.primary : theme.surface, marginRight: 8 }} onPress={() => setPeriod(p.key)}>
            <Text style={{ color: period === p.key ? '#ffffff' : theme.textSecondary, fontSize: 14 }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Staff Performance</Text>
          {names.length === 0 ? <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>No data</Text> : names.map((name, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontSize: 12, width: 80 }} numberOfLines={1}>{name}</Text>
                <View style={{ flex: 1, height: 8, backgroundColor: theme.border, borderRadius: 4, marginHorizontal: 8 }}>
                  <View style={{ height: '100%', width: `${Math.min(100, ((counts[i] || 0) / maxCount) * 100)}%`, backgroundColor: theme.primary, borderRadius: 4 }} />
                </View>
                <Text style={{ color: theme.primary, fontSize: 12, width: 24 }}>{counts[i] || 0}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.grid}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.primary, fontSize: 24, fontWeight: 'bold' }}>{counts.reduce((a, b) => a + (b || 0), 0)}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('totalServed')}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.secondary, fontSize: 24, fontWeight: 'bold' }}>{names.length}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('manageStaff')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { marginBottom: 12, width: 40, height: 40 }, headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 16 }, section: { padding: 16, borderRadius: 16, marginBottom: 16 },
  grid: { flexDirection: 'row' }, card: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', margin: 4 },
});

export default AdminAnalyticsScreen;
