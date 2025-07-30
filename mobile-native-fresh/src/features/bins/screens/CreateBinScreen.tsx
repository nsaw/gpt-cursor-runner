import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { AutoRoleView } from '../../../components/AutoRoleView';
import { useTheme } from '../../../hooks/useTheme';
import { useBins } from '../../home/hooks/useBins';

const CreateBinScreen: React.FC = () => {
  const { theme } = useTheme();
  const { createBin } = useBins();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleConfirm = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a bin name');
      return;
    }

    try {
      await createBin({ name: name.trim(), description: description.trim() });
      Alert.alert('Success', 'Bin created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create bin');
    }
  };

  return (
    <AutoRoleView role="Section" style={theme.styles.screenContainer}>
      <Text style={theme.styles.header}>Create New Bin</Text>

      <View style={theme.styles.inputContainer}>
        <Text style={theme.styles.label}>Name</Text>
        <TextInput
          style={theme.styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="Enter bin name"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={theme.styles.inputContainer}>
        <Text style={theme.styles.label}>Description (Optional)</Text>
        <TextInput
          style={[theme.styles.textInput, theme.styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Pressable onPress={handleConfirm} style={theme.styles.primaryButton}>
        <Text style={theme.styles.buttonText}>Create Bin</Text>
      </Pressable>
    </AutoRoleView>
  );
};

export default CreateBinScreen;