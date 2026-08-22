import React from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Switch, Text } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormSelect } from '@components/forms/FormSelect';
import { FormDateField } from '@components/forms/FormDateField';
import { FormTagInput } from '@components/forms/FormTagInput';
import { useAppTheme } from '@theme/ThemeProvider';
import { useExperienceStore } from '@store/experienceStore';
import { experienceSchema, ExperienceFormValues, EMPLOYMENT_TYPE_OPTIONS } from '@lib/validators/experienceSchema';

export default function ExperienceFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useExperienceStore();
  const existing = id ? getById(id) : undefined;

  const { control, handleSubmit, watch, setValue } = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      company: existing?.company ?? '',
      role: existing?.role ?? '',
      location: existing?.location ?? '',
      employmentType: existing?.employmentType ?? 'full-time',
      startDate: existing?.startDate ?? new Date().toISOString(),
      endDate: existing?.endDate,
      isCurrent: existing?.isCurrent ?? true,
      description: existing?.description ?? '',
      achievements: existing?.achievements ?? [],
      techStack: existing?.techStack ?? [],
    },
  });

  const isCurrent = watch('isCurrent');

  const onSubmit = async (values: ExperienceFormValues) => {
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
      <Stack.Screen options={{ title: existing ? 'Edit Experience' : 'Add Experience' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormTextInput control={control} name="company" label="Company" placeholder="e.g. Acme Corp" />
        <FormTextInput control={control} name="role" label="Role / title" placeholder="e.g. Senior Software Engineer" />
        <FormTextInput control={control} name="location" label="Location (optional)" placeholder="e.g. Remote / Bengaluru" />
        <FormSelect control={control} name="employmentType" label="Employment type" options={EMPLOYMENT_TYPE_OPTIONS} />
        <FormDateField control={control} name="startDate" label="Start date" />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.custom.spacing.md,
          }}
        >
          <Text variant="bodyLarge">Currently working here</Text>
          <Switch value={isCurrent} onValueChange={(v) => setValue('isCurrent', v)} />
        </View>

        {!isCurrent ? <FormDateField control={control} name="endDate" label="End date" /> : null}
        <FormTextInput
          control={control}
          name="description"
          label="Responsibilities / summary"
          multiline
          numberOfLines={4}
        />
        <FormTagInput control={control} name="achievements" label="Key achievements" placeholder="e.g. Reduced API latency by 40%" />
        <FormTagInput control={control} name="techStack" label="Tech stack" placeholder="e.g. React Native" />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add experience'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete experience
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
