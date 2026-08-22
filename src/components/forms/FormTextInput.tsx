import React from 'react';
import { View } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { TextInput, HelperText } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';

interface FormTextInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  secureTextEntry?: boolean;
  left?: React.ReactNode;
  disabled?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

/**
 * Wraps react-native-paper's TextInput with react-hook-form's Controller
 * and standardized error display. Used by every form screen in the app.
 */
export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  multiline,
  numberOfLines,
  keyboardType = 'default',
  secureTextEntry,
  left,
  disabled,
  autoCapitalize = 'sentences',
}: FormTextInputProps<T>) {
  const theme = useAppTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={{ marginBottom: theme.custom.spacing.md }}>
          <TextInput
            mode="outlined"
            label={label}
            placeholder={placeholder}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            disabled={disabled}
            autoCapitalize={autoCapitalize}
            error={!!error}
            left={left as never}
            accessibilityLabel={label}
          />
          {error ? (
            <HelperText type="error" visible>
              {error.message}
            </HelperText>
          ) : null}
        </View>
      )}
    />
  );
}
