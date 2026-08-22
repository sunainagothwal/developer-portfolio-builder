import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Switch, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormSelect } from '@components/forms/FormSelect';
import { useAppTheme } from '@theme/ThemeProvider';
import { useSkillsStore } from '@store/skillsStore';
import {
  skillSchema,
  SkillFormValues,
  SKILL_CATEGORY_OPTIONS,
  SKILL_LEVEL_OPTIONS,
} from '@lib/validators/skillSchema';

export default function SkillFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useSkillsStore();
  const existing = id ? getById(id) : undefined;

  const { control, handleSubmit, setValue, watch } = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: existing?.name ?? '',
      category: existing?.category ?? 'language',
      level: existing?.level ?? 'intermediate',
      yearsOfExperience: existing?.yearsOfExperience,
      featured: existing?.featured ?? false,
      notes: existing?.notes ?? '',
    },
  });

  const featured = watch('featured');

  const onSubmit = async (values: SkillFormValues) => {
    if (existing) {
      await edit(existing.id, values);
    } else {
      await add(values);
    }
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('Delete skill', `Remove "${existing.name}" from your skills?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      {/*
        The stack header is off for this route (see app/_layout.tsx), so the
        screen carries its own. A modal reads better closed with an explicit
        control than with a back chevron, which implies going up a level.
      */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
            {existing ? 'Edit skill' : 'Add skill'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {existing ? 'Update how this skill appears on your portfolio.' : 'Name it, then set how strong you are.'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [
            styles.close,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.custom.radius.pill,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <FormTextInput control={control} name="name" label="Skill name" placeholder="e.g. TypeScript" />
      <FormSelect control={control} name="category" label="Category" options={SKILL_CATEGORY_OPTIONS} />
      <FormSelect control={control} name="level" label="Proficiency" options={SKILL_LEVEL_OPTIONS} />
      <FormTextInput
        control={control}
        name="yearsOfExperience"
        label="Years of experience (optional)"
        keyboardType="numeric"
      />
      <FormTextInput control={control} name="notes" label="Notes (optional)" multiline numberOfLines={3} />

      <Pressable
        onPress={() => setValue('featured', !featured)}
        accessibilityRole="switch"
        accessibilityState={{ checked: featured }}
        accessibilityLabel="Feature on portfolio"
        style={[
          styles.featureRow,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.surfaceVariant,
            borderRadius: theme.custom.radius.lg,
            marginBottom: theme.custom.spacing.xl,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={featured ? 'star' : 'star-outline'}
          size={22}
          color={featured ? theme.custom.brand.warning : theme.colors.onSurfaceVariant}
        />
        <View style={styles.featureText}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            Feature on portfolio
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Highlighted at the top of your skills list.
          </Text>
        </View>
        <Switch value={featured} onValueChange={(v) => setValue('featured', v)} />
      </Pressable>

      <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginBottom: 12 }}>
        {existing ? 'Save changes' : 'Add skill'}
      </Button>
      {existing ? (
        <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
          Delete skill
        </Button>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 12, marginBottom: 20 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  featureText: { flex: 1 },
});
