import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface QuickActionsProps {
  onActionPress: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionPress }) => {
  const { theme } = useTheme();

  const actions = [
    { id: 'create', title: 'Create Thoughtmark', icon: '📝' },
    { id: 'search', title: 'Search', icon: '🔍' },
    { id: 'bins', title: 'View Bins', icon: '📁' }
  ];

  return (
    <AutoRoleView role="Section" style={theme.styles.quickActionsContainer}>
      <Text style={theme.styles.sectionTitle}>Quick Actions</Text>
      <View style={theme.styles.actionsGrid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onActionPress(action.id)}
            style={theme.styles.actionButton}
          >
            <Text style={theme.styles.actionIcon}>{action.icon}</Text>
            <Text style={theme.styles.actionTitle}>{action.title}</Text>
          </Pressable>
        ))}
      </View>
    </AutoRoleView>
  );
};

export default QuickActions;