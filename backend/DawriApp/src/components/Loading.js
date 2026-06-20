import React from 'react';
import { View, ActivityIndicator } from 'react-native';

const Loading = ({ size, color }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size={size || 'large'} color={color || '#2563eb'} />
  </View>
);

export default Loading;
