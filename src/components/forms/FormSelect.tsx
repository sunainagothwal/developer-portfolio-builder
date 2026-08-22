import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Text, Chip } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: Option[];
}

/** Chip-based single-select, backed by react-hook-form. Used for enums like status/category/level. */
export function FormSelect<T extends FieldValues>({ control, name, label, options }: FormSelectProps<T>) {
  const theme = useAppTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={{ marginBottom: theme.custom.spacing.md }}>
          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.xs }}
          >
            {label}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {options.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={value === opt.value}
                  onPress={() => onChange(opt.value)}
                  mode={value === opt.value ? 'flat' : 'outlined'}
                  style={{ marginRight: theme.custom.spacing.sm }}
                  showSelectedCheck={false}
                >
                  {opt.label}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
