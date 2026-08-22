import React from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormSelect } from '@components/forms/FormSelect';
import { FormDateField } from '@components/forms/FormDateField';
import { useAppTheme } from '@theme/ThemeProvider';
import { useAchievementsStore } from '@store/achievementsStore';
import { achievementSchema, AchievementFormValues, ACHIEVEMENT_CATEGORY_OPTIONS } from '@lib/validators/achievementSchema';

export default function AchievementFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useAchievementsStore();
  const existing = id ? getById(id) : undefined;

  const { control, handleSubmit } = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      title: existing?.title ?? '',
      category: existing?.category ?? 'award',
      date: existing?.date ?? new Date().toISOString(),
      description: existing?.description ?? '',
      url: existing?.url ?? '',
    },
  });

  const onSubmit = async (values: AchievementFormValues) => {
    if (existing) await edit(existing.id, values);
    else await add(values);
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
      <Stack.Screen options={{ title: existing ? 'Edit Achievement' : 'Add Achievement' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormTextInput control={control} name="title" label="Title" placeholder="e.g. Speaker at ReactConf 2025" />
        <FormSelect control={control} name="category" label="Category" options={ACHIEVEMENT_CATEGORY_OPTIONS} />
        <FormDateField control={control} name="date" label="Date" />
        <FormTextInput control={control} name="description" label="Description (optional)" multiline numberOfLines={3} />
        <FormTextInput control={control} name="url" label="Link (optional)" keyboardType="url" autoCapitalize="none" />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add achievement'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete achievement
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
