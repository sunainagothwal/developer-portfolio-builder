import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Text, IconButton } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormSelect } from '@components/forms/FormSelect';
import { FormDateField } from '@components/forms/FormDateField';
import { useAppTheme } from '@theme/ThemeProvider';
import { useInterviewStore } from '@store/interviewStore';
import { interviewSchema, InterviewFormValues, INTERVIEW_STAGE_OPTIONS } from '@lib/validators/interviewSchema';
import { generateId } from '@utils/id';
import { formatDate } from '@utils/date';
import type { InterviewRound } from '@models/models';

export default function InterviewFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useInterviewStore();
  const existing = id ? getById(id) : undefined;
  const [rounds, setRounds] = useState<InterviewRound[]>(existing?.rounds ?? []);

  const { control, handleSubmit, watch } = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      company: existing?.company ?? '',
      role: existing?.role ?? '',
      stage: existing?.stage ?? 'applied',
      appliedDate: existing?.appliedDate ?? new Date().toISOString(),
      location: existing?.location ?? '',
      salaryRange: existing?.salaryRange ?? '',
      notes: existing?.notes ?? '',
      jobUrl: existing?.jobUrl ?? '',
    },
  });

  const currentStage = watch('stage');

  const logRound = () => {
    setRounds([...rounds, { id: generateId(), stage: currentStage, date: new Date().toISOString() }]);
  };

  const onSubmit = async (values: InterviewFormValues) => {
    const payload = { ...values, rounds };
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
      <Stack.Screen options={{ title: existing ? 'Edit Application' : 'Add Application' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormTextInput control={control} name="company" label="Company" />
        <FormTextInput control={control} name="role" label="Role" />
        <FormSelect control={control} name="stage" label="Current stage" options={INTERVIEW_STAGE_OPTIONS} />
        <FormDateField control={control} name="appliedDate" label="Applied date" />
        <FormTextInput control={control} name="location" label="Location (optional)" />
        <FormTextInput control={control} name="salaryRange" label="Salary range (optional)" />
        <FormTextInput control={control} name="jobUrl" label="Job posting URL (optional)" keyboardType="url" autoCapitalize="none" />
        <FormTextInput control={control} name="notes" label="Notes (optional)" multiline numberOfLines={3} />

        <View style={styles.roundsHeader}>
          <Text variant="titleSmall">Round history</Text>
          <IconButton icon="plus-circle-outline" size={20} onPress={logRound} />
        </View>
        {rounds.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Log the current stage as a round to build a timeline of this application.
          </Text>
        ) : (
          rounds.map((r) => (
            <View key={r.id} style={[styles.roundRow, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.custom.radius.sm }]}>
              <Text variant="bodyMedium">{INTERVIEW_STAGE_OPTIONS.find((o) => o.value === r.stage)?.label}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(r.date, 'MMM d, yyyy')}
              </Text>
            </View>
          ))
        )}

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add application'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete application
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  roundsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, marginBottom: 8 },
});
