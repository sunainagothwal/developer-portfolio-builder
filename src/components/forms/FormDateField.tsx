import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { TextInput, HelperText } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';
import { parseDateText, formatDateText } from '@utils/dateText';

interface FormDateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  allowPresent?: boolean; // lets the user type "Present" for an ongoing role
}

interface DateTextInputProps {
  label: string;
  allowPresent: boolean;
  value?: string;
  onChange: (iso: string | undefined) => void;
  errorMessage?: string;
}

/**
 * Kept as its own component so the draft text lives in local state. Committing
 * on blur (rather than on every keystroke) means a half-typed "Ja" never wipes
 * the stored value.
 */
const DateTextInput: React.FC<DateTextInputProps> = ({ label, allowPresent, value, onChange, errorMessage }) => {
  const theme = useAppTheme();
  const [text, setText] = useState(() => formatDateText(value, allowPresent));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  // Re-sync when the form value changes from elsewhere (edit screen loading,
  // resume import, reset) — but never while the user is mid-edit.
  useEffect(() => {
    if (!focused) setText(formatDateText(value, allowPresent));
  }, [value, allowPresent, focused]);

  const commit = () => {
    setFocused(false);
    const result = parseDateText(text, allowPresent);
    if (!result.valid) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(result.iso);
    // Normalise what was typed ("jan 2022" -> "Jan 2022").
    setText(formatDateText(result.iso, allowPresent));
  };

  const hint = allowPresent ? 'e.g. Jan 2022 — or type Present' : 'e.g. Jan 2022';

  return (
    <View style={{ marginBottom: theme.custom.spacing.md }}>
      <TextInput
        mode="outlined"
        label={label}
        value={text}
        placeholder={hint}
        onChangeText={(next) => {
          setText(next);
          if (invalid) setInvalid(false);
        }}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onSubmitEditing={commit}
        returnKeyType="done"
        autoCapitalize="words"
        autoCorrect={false}
        // Highlights the existing value on focus so a single tap lets the user
        // type straight over it instead of clearing it character by character.
        selectTextOnFocus
        error={invalid || !!errorMessage}
        accessibilityLabel={`${label}. ${hint}`}
      />
      <HelperText type={invalid || errorMessage ? 'error' : 'info'} visible>
        {invalid ? `Couldn't read that date. Try "Jan 2022".` : errorMessage ?? hint}
      </HelperText>
    </View>
  );
};

/** Month/year entered as plain text — no calendar, no dropdowns, no modal. */
export function FormDateField<T extends FieldValues>({ control, name, label, allowPresent }: FormDateFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <DateTextInput
          label={label}
          allowPresent={!!allowPresent}
          value={value}
          onChange={onChange}
          errorMessage={error?.message}
        />
      )}
    />
  );
}
