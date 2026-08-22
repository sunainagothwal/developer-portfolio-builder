import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Text, TextInput, IconButton, HelperText } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';

interface LinkItem {
  label: string;
  url: string;
}

interface FormLinkListProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/** Editor for an array of { label, url } objects — used by Project links and Profile social links. */
export function FormLinkList<T extends FieldValues>({ control, name, label }: FormLinkListProps<T>) {
  const theme = useAppTheme();
  const [draftLabel, setDraftLabel] = useState('');
  const [draftUrl, setDraftUrl] = useState('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const links: LinkItem[] = value ?? [];

        const addLink = () => {
          if (!draftLabel.trim() || !draftUrl.trim()) return;
          onChange([...links, { label: draftLabel.trim(), url: draftUrl.trim() }]);
          setDraftLabel('');
          setDraftUrl('');
        };

        const removeLink = (index: number) => {
          onChange(links.filter((_, i) => i !== index));
        };

        return (
          <View style={{ marginBottom: theme.custom.spacing.md }}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.xs }}
            >
              {label}
            </Text>

            {links.map((link, index) => (
              <View
                key={`${link.url}-${index}`}
                style={[
                  styles.linkRow,
                  { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.custom.radius.sm },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium">{link.label}</Text>
                  <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                    {link.url}
                  </Text>
                </View>
                <IconButton icon="close" size={16} onPress={() => removeLink(index)} />
              </View>
            ))}

            <View style={styles.inputRow}>
              <TextInput
                mode="outlined"
                placeholder="Label (e.g. GitHub)"
                value={draftLabel}
                onChangeText={setDraftLabel}
                style={{ flex: 1, marginRight: 8 }}
                dense
              />
              <TextInput
                mode="outlined"
                placeholder="https://..."
                value={draftUrl}
                onChangeText={setDraftUrl}
                style={{ flex: 1.4 }}
                autoCapitalize="none"
                keyboardType="url"
                // Submitting from the URL field adds the row, so no button is
                // needed and there's nothing to mis-tap while the keyboard is up.
                onSubmitEditing={addLink}
                returnKeyType="done"
                blurOnSubmit={false}
                dense
              />
            </View>
            <HelperText type="info" visible>
              Fill both fields, then press enter to add
            </HelperText>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 8, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
});
