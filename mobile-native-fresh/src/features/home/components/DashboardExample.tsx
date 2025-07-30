import React from 'react';
import { View, Text } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface DashboardExampleProps {
  data: any;
}

const DashboardExample: React.FC<DashboardExampleProps> = ({ data }) => {
  const { theme } = useTheme();

  return (
    <AutoRoleView role="Section" style={theme.styles.card}>
      <Text style={theme.styles.cardTitle}>Dashboard Example</Text>
      <Text style={theme.styles.cardContent}>{JSON.stringify(data)}</Text>
    </AutoRoleView>
  );
};

export default DashboardExample;