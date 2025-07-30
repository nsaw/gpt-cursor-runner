import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { AutoRoleView } from '../../../components/AutoRoleView';
import { useTheme } from '../../../hooks/useTheme';
import { useThoughtmarks } from '../../home/hooks/useThoughtmarks';

const ContentScreen: React.FC = () => {
  const { theme } = useTheme();
  const { thoughtmarks, loading } = useThoughtmarks();

  const renderItem = ({ item }: { item: any }) => (
    <View style={theme.styles.card}>
      <Text style={theme.styles.cardTitle}>{item.title}</Text>
      <Text style={theme.styles.cardContent}>{item.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <AutoRoleView role="Section" style={theme.styles.screenContainer}>
        <Text style={theme.styles.loading}>Loading content...</Text>
      </AutoRoleView>
    );
  }

  return (
    <AutoRoleView role="Section" style={theme.styles.screenContainer}>
      <Text style={theme.styles.header}>Content</Text>
      <FlatList
        data={thoughtmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </AutoRoleView>
  );
};

export default ContentScreen;