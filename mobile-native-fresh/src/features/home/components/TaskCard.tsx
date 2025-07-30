import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface TaskCardProps {
  task: any;
  onPress: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress }) => {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <Pressable onPress={onPress} style={theme.styles.card}>
      <AutoRoleView role="Section" style={theme.styles.cardContent}>
        <View style={theme.styles.taskHeader}>
          <Text style={theme.styles.taskTitle}>{task.title}</Text>
          <Text style={theme.styles.taskStatus}>{task.status}</Text>
        </View>
        {task.description && (
          <Text style={theme.styles.taskDescription}>{task.description}</Text>
        )}
        {task.dueDate && (
          <Text style={theme.styles.taskDueDate}>Due: {task.dueDate}</Text>
        )}
      </AutoRoleView>
    </Pressable>
  );
};

export default TaskCard;