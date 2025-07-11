import React from 'react';
import { View, Text, Image } from 'react-native';

const OnboardingModal: React.FC = () => {
  return (
    <View style={{ paddingTop: 30 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 20 }}>🚀 Welcome to Runner Mode</Text>
      <Text>This text will be patched by the runner.</Text>
      <Text>✅ ✅ Test patch applied successfully! applied successfully!</Text>
      <Image source={{ uri: 'test-image.jpg' }} style={{ resizeMode: 'contain' }} />
    </View>
  );
};

export default OnboardingModal; 