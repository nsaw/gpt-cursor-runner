import React from 'react';
import { View, Text } from 'react-native';
import { useSlotMode } from '../state/slotMode';
declare const console: any;

export const AIToolsCard = () => {
  const [slotMode] = useSlotMode();
  const isMock = slotMode === 'mock';
  console.log(`AIToolsCard: Rendering (${slotMode} mode)`);
  const tools = isMock
    ? [{ id: 'ai1', name: 'Claude View' }, { id: 'ai2', name: 'GPT Slot Explainer' }]
    : [];
  return (
    <View style={{ backgroundColor: '#555', padding: 12, borderRadius: 12 }}>
      <Text style={{ color: 'white', fontWeight: 'bold' }}>🤖 AI Tools</Text>
      {tools.length > 0 ? (
        tools.map(tool => (
          <Text key={tool.id} style={{ color: 'white', marginTop: 4 }}>• {tool.name}</Text>
        ))
      ) : (
        <Text style={{ color: 'gray', marginTop: 4 }}>[TODO: Load real tools]</Text>
      )}
    </View>
  );
};