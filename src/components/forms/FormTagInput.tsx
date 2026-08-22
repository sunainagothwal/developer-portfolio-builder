import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Text, Chip, TextInput } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';

interface FormTagInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
}

/** Free-text tag entry (press "+" or submit to add). Backs techStack, tags, etc. */
export function FormTagInput<T extends FieldValues>({ control, name, label, placeholder }: FormTagInputProps<T>) {
  const theme = useAppTheme();
  const [draft, setDraft] = useState('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const tags: string[] = value ?? [];

        const addTag = () => {
          const trimmed = draft.trim();
          if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
          }
          setDraft('');
        };

        const removeTag = (tag: string) => {
          onChange(tags.filter((t) => t !== tag));
        };

        return (
          <View style={{ marginBottom: theme.custom.spacing.md }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.xs }}
            >
              {label}
            </Text>
            <TextInput
              mode="outlined"
              value={draft}
              placeholder={placeholder ?? 'Type and press enter'}
              onChangeText={setDraft}
              onSubmitEditing={addTag}
              returnKeyType="done"
              // Keeps the keyboard up so several tags can be added in a row.
              blurOnSubmit={false}
              accessibilityLabel={`Add ${label}`}
            />
            {tags.length > 0 ? (
              <View style={styles.tagsWrap}>
                {tags.map((tag) => (
                  <Chip key={tag} onClose={() => removeTag(tag)} style={styles.chip}>
                    {tag}
                  </Chip>
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  chip: { marginRight: 4, marginBottom: 4 },
});
