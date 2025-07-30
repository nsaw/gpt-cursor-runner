import React from 'react';
import { View, FlatList } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';
import ThoughtmarkCard from './ThoughtmarkCard';

interface ThoughtmarkListProps {
  thoughtmarks: any[];
  onThoughtmarkPress: (thoughtmark: any) => void;
  onThoughtmarkDelete?: (thoughtmark: any) => void;
}

const ThoughtmarkList: React.FC<ThoughtmarkListProps> = ({ 
  thoughtmarks, 
  onThoughtmarkPress, 
  onThoughtmarkDelete 
}) => {
  const { theme } = useTheme();

  const renderItem = ({ item }: { item: any }) => (
    <ThoughtmarkCard
      thoughtmark={item}
      onPress={() => onThoughtmarkPress(item)}
      onDelete={onThoughtmarkDelete ? () => onThoughtmarkDelete(item) : undefined}
    />
  );

  return (
    <AutoRoleView role="Section" style={theme.styles.listContainer}>
      <FlatList
        data={thoughtmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={theme.styles.separator} />}
      />
    </AutoRoleView>
  );
};

export default ThoughtmarkList;