import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Text, Chip } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';
import type { Skill } from '@models/models';

interface FormSkillPickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  skills: Skill[];
}

/** Multi-select of existing Skill entities, used to link Projects <-> Skills. */
export function FormSkillPicker<T extends FieldValues>({ control, name, label, skills }: FormSkillPickerProps<T>) {
  const theme = useAppTheme();

  if (skills.length === 0) {
    return (
      <View style={{ marginBottom: theme.custom.spacing.md }}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Add skills first from the Skills manager to link them here.
        </Text>
      </View>
    );
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const selected: string[] = value ?? [];
        const toggle = (id: string) => {
          onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
        };

        return (
          <View style={{ marginBottom: theme.custom.spacing.md }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.xs }}
            >
              {label}
            </Text>
            <View style={styles.wrap}>
              {skills.map((skill) => (
                <Chip
                  key={skill.id}
                  selected={selected.includes(skill.id)}
                  onPress={() => toggle(skill.id)}
                  style={{ marginRight: 6, marginBottom: 6 }}
                  showSelectedCheck={false}
                >
                  {skill.name}
                </Chip>
              ))}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
