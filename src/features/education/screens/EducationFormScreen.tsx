import React from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Switch, Text } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormDateField } from '@components/forms/FormDateField';
import { useAppTheme } from '@theme/ThemeProvider';
import { useEducationStore } from '@store/educationStore';
import { educationSchema, EducationFormValues } from '@lib/validators/educationSchema';

export default function EducationFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useEducationStore();
  const existing = id ? getById(id) : undefined;

  const { control, handleSubmit, watch, setValue } = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: existing?.institution ?? '',
      degree: existing?.degree ?? '',
      fieldOfStudy: existing?.fieldOfStudy ?? '',
      startDate: existing?.startDate ?? new Date().toISOString(),
      endDate: existing?.endDate,
      isCurrent: existing?.isCurrent ?? false,
      grade: existing?.grade ?? '',
      description: existing?.description ?? '',
    },
  });

  const isCurrent = watch('isCurrent');

  const onSubmit = async (values: EducationFormValues) => {
    const payload = { ...values, endDate: values.isCurrent ? undefined : values.endDate };
    if (existing) await edit(existing.id, payload);
    else await add(payload);
    router.back();
  };

  const onDelete = async () => {
    if (existing) {
      await remove(existing.id);
      router.back();
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Edit Education' : 'Add Education' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormTextInput control={control} name="institution" label="Institution" placeholder="e.g. Stanford University" />
        <FormTextInput control={control} name="degree" label="Degree" placeholder="e.g. B.S. Computer Science" />
        <FormTextInput control={control} name="fieldOfStudy" label="Field of study (optional)" />
        <FormDateField control={control} name="startDate" label="Start date" />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.custom.spacing.md,
          }}
        >
          <Text variant="bodyLarge">Currently studying here</Text>
          <Switch value={isCurrent} onValueChange={(v) => setValue('isCurrent', v)} />
        </View>

        {!isCurrent ? <FormDateField control={control} name="endDate" label="End date" /> : null}
        <FormTextInput control={control} name="grade" label="Grade / GPA (optional)" />
        <FormTextInput control={control} name="description" label="Description (optional)" multiline numberOfLines={3} />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add education'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete education
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
