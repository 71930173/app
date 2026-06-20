import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EmptyState = ({ title, message, color }) => (
  <View style={styles.container}>
    <Text style={[styles.title, { color: color || '#64748b' }]}>
      {title || 'No data available'}
    </Text>
    {message && (
      <Text style={[styles.message, { color: color || '#94a3b8' }]}>
        {message}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default EmptyState;
