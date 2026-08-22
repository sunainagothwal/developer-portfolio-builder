import React, { useEffect } from 'react';
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
import { FormImageList } from '@components/forms/FormImageList';
import { FormLinkList } from '@components/forms/FormLinkList';
import { FormSkillPicker } from '@components/forms/FormSkillPicker';
import { useAppTheme } from '@theme/ThemeProvider';
import { useProjectsStore } from '@store/projectsStore';
import { useSkillsStore } from '@store/skillsStore';
import { projectSchema, ProjectFormValues, PROJECT_STATUS_OPTIONS } from '@lib/validators/projectSchema';

export default function ProjectFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useProjectsStore();
  const { items: skills, load: loadSkills, loaded: skillsLoaded } = useSkillsStore();
  const existing = id ? getById(id) : undefined;

  useEffect(() => {
    if (!skillsLoaded) loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { control, handleSubmit, watch, setValue } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: existing?.title ?? '',
      summary: existing?.summary ?? '',
      description: existing?.description ?? '',
      status: existing?.status ?? 'in-progress',
      techStack: existing?.techStack ?? [],
      role: existing?.role ?? '',
      startDate: existing?.startDate,
      endDate: existing?.endDate,
      links: existing?.links ?? [],
      images: existing?.images ?? [],
      featured: existing?.featured ?? false,
      skillIds: existing?.skillIds ?? [],
    },
  });

  const featured = watch('featured');

  const onSubmit = async (values: ProjectFormValues) => {
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
      <Stack.Screen options={{ title: existing ? 'Edit Project' : 'Add Project' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormImageList control={control} name="images" label="Screenshots (optional)" />
        <FormTextInput control={control} name="title" label="Project title" placeholder="e.g. Developer Portfolio Builder" />
        <FormTextInput control={control} name="summary" label="Short summary" placeholder="One line describing the project" />
        <FormSelect control={control} name="status" label="Status" options={PROJECT_STATUS_OPTIONS} />
        <FormTextInput control={control} name="role" label="Your role (optional)" placeholder="e.g. Lead Developer" />
        <FormDateField control={control} name="startDate" label="Start date (optional)" allowPresent />
        <FormDateField control={control} name="endDate" label="End date (optional)" allowPresent />
        <FormTextInput
          control={control}
          name="description"
          label="Full description"
          placeholder="What did you build? What problem did it solve?"
          multiline
          numberOfLines={5}
        />
        <FormTagInput control={control} name="techStack" label="Tech stack" placeholder="e.g. React Native" />
        <FormSkillPicker control={control} name="skillIds" label="Related skills" skills={skills} />
        <FormLinkList control={control} name="links" label="Links (demo, source, case study)" />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.custom.spacing.lg,
          }}
        >
          <Text variant="bodyLarge">Feature this project</Text>
          <Switch value={featured} onValueChange={(v) => setValue('featured', v)} />
        </View>

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add project'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete project
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
