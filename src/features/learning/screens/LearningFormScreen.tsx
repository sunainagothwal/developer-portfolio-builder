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
import { useLearningStore } from '@store/learningStore';
import {
  learningSchema,
  LearningFormValues,
  LEARNING_TYPE_OPTIONS,
  LEARNING_STATUS_OPTIONS,
} from '@lib/validators/learningSchema';

export default function LearningFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useLearningStore();
  const existing = id ? getById(id) : undefined;

  const { control, handleSubmit } = useForm<LearningFormValues>({
    resolver: zodResolver(learningSchema),
    defaultValues: {
      title: existing?.title ?? '',
      type: existing?.type ?? 'course',
      status: existing?.status ?? 'planned',
      progress: existing?.progress ?? 0,
      source: existing?.source ?? '',
      url: existing?.url ?? '',
      notes: existing?.notes ?? '',
      targetDate: existing?.targetDate,
    },
  });

  const onSubmit = async (values: LearningFormValues) => {
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
      <Stack.Screen options={{ title: existing ? 'Edit Item' : 'Add Learning Item' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormTextInput control={control} name="title" label="Title" placeholder="e.g. Advanced TypeScript Patterns" />
        <FormSelect control={control} name="type" label="Type" options={LEARNING_TYPE_OPTIONS} />
        <FormSelect control={control} name="status" label="Status" options={LEARNING_STATUS_OPTIONS} />
        <FormTextInput control={control} name="progress" label="Progress % (0-100)" keyboardType="numeric" />
        <FormTextInput control={control} name="source" label="Source (optional)" placeholder="e.g. Udemy, O'Reilly" />
        <FormTextInput control={control} name="url" label="Link (optional)" keyboardType="url" autoCapitalize="none" />
        <FormDateField control={control} name="targetDate" label="Target completion date (optional)" allowPresent />
        <FormTextInput control={control} name="notes" label="Notes (optional)" multiline numberOfLines={3} />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add item'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete item
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
