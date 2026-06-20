import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { staffAPI } from '../../services/api';
import Loading from '../../components/Loading';

const StaffStatsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffAPI.getMyStats('day').then((res) => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const items = [
    { label: t('totalServed'), value: stats?.total_served || 0, color: theme.primary },
    { label: t('studentsServed'), value: stats?.students_served || 0, color: theme.info },
    { label: t('guestsServed'), value: stats?.guests_served || 0, color: theme.secondary },
    { label: t('avgWaitTime'), value: `${stats?.avg_wait_time || 0}m`, color: theme.warning },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('myStats')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {items.map((item, i) => (
            <View key={i} style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={{ color: item.color, fontSize: 28, fontWeight: 'bold' }}>{item.value}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { marginBottom: 12, width: 40, height: 40 }, headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { width: '47%', padding: 16, borderRadius: 16, alignItems: 'center', margin: 4 },
});

export default StaffStatsScreen;
