import React from 'react';
import { View, StyleSheet, TextInput, Pressable, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@theme/ThemeProvider';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * Flat, pill-shaped search input used across list screens.
 * Replaces Paper's Searchbar, which ships a raised card look that reads
 * heavy against the app's flat surfaces.
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
}) => {
  const theme = useAppTheme();
  const hasValue = value.length > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.custom.radius.lg,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
      <TextInput
        style={[styles.input, { color: theme.colors.onSurface }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {hasValue ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    // Zeroed so the row's minHeight controls height consistently on both
    // platforms (Android otherwise adds its own vertical padding).
    paddingVertical: 0,
  },
});
