import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { staffAPI } from '../../services/api';
import Loading from '../../components/Loading';

const StaffDashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ totalWaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await staffAPI.getMyQueue(); setStats({ totalWaiting: res.data?.total_waiting || 0 }); } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const menuItems = [
    { title: t('serveQueue'), color: theme.primary, screen: 'StaffQueue' },
    { title: t('myStats'), color: theme.secondary, screen: 'StaffStats' },
    { title: t('settings'), color: theme.textSecondary, screen: 'StaffSettings' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.warning }]}><Text style={styles.avatarText}>{(user?.firstName || user?.first_name || 'S')[0]}</Text></View>
            <View>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('welcome')},</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>{user?.firstName || user?.first_name || 'Staff'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout}><Text style={{ color: theme.danger, fontSize: 14 }}>{t('logout')}</Text></TouchableOpacity>
        </View>
        <View style={styles.statBox}>
          <Text style={{ color: theme.primary, fontSize: 24, fontWeight: 'bold' }}>{stats.totalWaiting}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{t('waiting')}</Text>
        </View>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} contentContainerStyle={styles.scroll}>
        <View style={styles.menuRow}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuItem, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate(item.screen)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}><Text style={[styles.menuIconText, { color: item.color }]}>{item.title[0]}</Text></View>
              <Text style={[styles.menuText, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }, statBox: { padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: theme => theme.surfaceVariant },
  scroll: { padding: 16 }, menuRow: { flexDirection: 'row', flexWrap: 'wrap' },
  menuItem: { width: '30%', flex: 1, minWidth: 90, padding: 14, borderRadius: 16, alignItems: 'center', margin: 4 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  menuIconText: { fontSize: 18, fontWeight: 'bold' }, menuText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});

export default StaffDashboardScreen;
