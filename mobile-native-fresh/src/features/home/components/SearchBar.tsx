import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { AutoRoleView } from '../../components/AutoRoleView';
import { useTheme } from '../../hooks/useTheme';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = 'Search...' }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query);
  };

  return (
    <AutoRoleView role="Section" style={theme.styles.searchContainer}>
      <View style={theme.styles.searchInputContainer}>
        <TextInput
          style={theme.styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          onSubmitEditing={handleSearch}
        />
        <Pressable onPress={handleSearch} style={theme.styles.searchButton}>
          <Text style={theme.styles.searchIcon}>🔍</Text>
        </Pressable>
      </View>
    </AutoRoleView>
  );
};

export default SearchBar;