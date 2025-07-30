import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onTagPress: (tag: string) => void;
  onClearAll: () => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ tags, selectedTags, onTagPress, onClearAll }) => {
  const { theme } = useTheme();

  return (
    <AutoRoleView role="Section" style={theme.styles.tagFilterContainer}>
      <View style={theme.styles.tagFilterHeader}>
        <Text style={theme.styles.sectionTitle}>Filter by Tags</Text>
        {selectedTags.length > 0 && (
          <Pressable onPress={onClearAll} style={theme.styles.clearButton}>
            <Text style={theme.styles.clearButtonText}>Clear All</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={theme.styles.tagsContainer}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onTagPress(tag)}
              style={[
                theme.styles.tagButton,
                selectedTags.includes(tag) && theme.styles.tagButtonActive
              ]}
            >
              <Text
                style={[
                  theme.styles.tagButtonText,
                  selectedTags.includes(tag) && theme.styles.tagButtonTextActive
                ]}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AutoRoleView>
  );
};

export default TagFilter;