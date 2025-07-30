import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface BinCardProps {
  bin: any;
  onPress: () => void;
}

const BinCard: React.FC<BinCardProps> = ({ bin, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={theme.styles.card}>
      <AutoRoleView role="Section" style={theme.styles.cardContent}>
        <Text style={theme.styles.cardTitle}>{bin.name}</Text>
        {bin.description && (
          <Text style={theme.styles.cardDescription}>{bin.description}</Text>
        )}
        <Text style={theme.styles.cardMeta}>{bin.thoughtmarkCount || 0} thoughtmarks</Text>
      </AutoRoleView>
    </Pressable>
  );
};

export default BinCard;