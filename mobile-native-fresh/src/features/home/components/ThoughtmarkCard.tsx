import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface ThoughtmarkCardProps {
  thoughtmark: any;
  onPress: () => void;
  onDelete?: () => void;
}

const ThoughtmarkCard: React.FC<ThoughtmarkCardProps> = ({ thoughtmark, onPress, onDelete }) => {
  const { theme } = useTheme();

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <Pressable onPress={onPress} style={theme.styles.card}>
      <AutoRoleView role="Section" style={theme.styles.cardContent}>
        <View style={theme.styles.thoughtmarkHeader}>
          <Text style={theme.styles.thoughtmarkTitle}>{thoughtmark.title}</Text>
          {onDelete && (
            <Pressable onPress={handleDelete} style={theme.styles.deleteButton}>
              <Text style={theme.styles.deleteIcon}>🗑️</Text>
            </Pressable>
          )}
        </View>
        <Text style={theme.styles.thoughtmarkContent}>{thoughtmark.content}</Text>
        {thoughtmark.tags && thoughtmark.tags.length > 0 && (
          <View style={theme.styles.tagsContainer}>
            {thoughtmark.tags.map((tag: string) => (
              <Text key={tag} style={theme.styles.tag}>{tag}</Text>
            ))}
          </View>
        )}
        <View style={theme.styles.thoughtmarkFooter}>
          <Text style={theme.styles.thoughtmarkDate}>{thoughtmark.createdAt}</Text>
          {thoughtmark.bin && (
            <Text style={theme.styles.thoughtmarkBin}>{thoughtmark.bin.name}</Text>
          )}
        </View>
      </AutoRoleView>
    </Pressable>
  );
};

export default ThoughtmarkCard;