import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
declare const console: any;

export default function DevModeBanner() {
  useEffect(() => console.log('Dev Mode'), []);
  return (
    <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: '#111', fontSize: 12 }}>Dev Mode</Text>
    </View>
  );
}