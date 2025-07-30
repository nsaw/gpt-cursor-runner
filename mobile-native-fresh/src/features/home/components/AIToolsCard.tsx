import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface AIToolsCardProps {
  onPress: () => void;
  title: string;
  description: string;
}

const AIToolsCard: React.FC<AIToolsCardProps> = ({ onPress, title, description }) => {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={theme.styles.card}>
      <AutoRoleView role="Section" style={theme.styles.cardContent}>
        <Text style={theme.styles.cardTitle}>{title}</Text>
        <Text style={theme.styles.cardDescription}>{description}</Text>
      </AutoRoleView>
    </Pressable>
  );
};

export default AIToolsCard;