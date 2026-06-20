import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme, issueColors } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { guestAPI } from '../../services/api';
import Loading from '../../components/Loading';

const issueIcons = { 'Admission': 'A', 'Financial': 'F', 'Academic': 'AC', 'IT Support': 'IT', 'Student Affairs': 'SA', 'Other': 'O' };

const GuestIssueSelectionScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await guestAPI.getIssueTypes(); setIssues(res.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Text style={{ color: theme.text, fontSize: 24 }}>&larr;</Text></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('selectIssue')}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{t('selectIssueTypePrompt')}</Text>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        {issues.map((issue) => {
          const color = issue.color || issueColors[issue.id] || theme.primary;
          const name = lang === 'ar' && issue.name_ar ? issue.name_ar : issue.name;
          return (
            <TouchableOpacity key={issue.id} style={[styles.card, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate('GuestStaffSelection', { issueTypeId: issue.id, issueTypeName: name, issueTypeColor: color })}>
              <View style={[styles.iconBox, { backgroundColor: color + '15' }]}><Text style={[styles.iconText, { color }]}>{issueIcons[issue.name] || '?'}</Text></View>
              <View style={styles.cardBody}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{name}</Text>{issue.description && <Text style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={2}>{issue.description}</Text>}</View>
              <Text style={{ color: theme.textMuted, fontSize: 20 }}>&rsaquo;</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { marginBottom: 12, width: 40, height: 40 }, headerTitle: { fontSize: 22, fontWeight: 'bold' },
  scroll: { padding: 16 }, card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 14, fontWeight: 'bold' }, cardBody: { flex: 1, marginHorizontal: 12 },
});

export default GuestIssueSelectionScreen;
