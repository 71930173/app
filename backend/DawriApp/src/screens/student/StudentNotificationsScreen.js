import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { studentAPI } from '../../services/api';
import { getRelativeTime } from '../../utils/helpers';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const StudentNotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await studentAPI.getNotifications(); setNotes(res.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try { await studentAPI.markNotificationRead(id); setNotes((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n)); } catch (e) { }
  };

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('notifications')}</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {notes.length === 0 ? <EmptyState title={t('noNotifications')} /> : notes.map((n) => (
          <TouchableOpacity key={n.id} style={[styles.card, { backgroundColor: theme.surface }, !n.is_read && { borderLeftWidth: 3, borderLeftColor: theme.primary }]} onPress={() => markRead(n.id)}>
            <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>{n.message}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{getRelativeTime(n.created_at, lang)}</Text>
          </TouchableOpacity>
        ))}
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
  card: { padding: 14, borderRadius: 12, marginBottom: 10 },
});

export default StudentNotificationsScreen;
