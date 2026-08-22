import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Avatar, IconButton } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormSelect } from '@components/forms/FormSelect';
import { FormLinkList } from '@components/forms/FormLinkList';
import { ResumeImportCard } from '@components/forms/ResumeImportCard';
import { useAppTheme } from '@theme/ThemeProvider';
import type { ParsedResume } from '@lib/import/resumeParser';
import { useProfileStore } from '@store/profileStore';
import { profileSchema, ProfileFormValues, AVAILABILITY_OPTIONS } from '@lib/validators/profileSchema';
import { generateId } from '@utils/id';

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { profile, update } = useProfileStore();

  const { control, handleSubmit, watch, setValue } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? '',
      headline: profile?.headline ?? '',
      bio: profile?.bio ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      location: profile?.location ?? '',
      website: profile?.website ?? '',
      avatarUri: profile?.avatarUri,
      socialLinks: profile?.socialLinks?.map((l) => ({ ...l })) ?? [],
      availability: profile?.availability ?? 'open-to-work',
    },
  });

  const avatarUri = watch('avatarUri');
  const fullName = watch('fullName');

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to set an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setValue('avatarUri', result.assets[0].uri);
    }
  };

  /**
   * Fills the form from a parsed resume. Only non-empty suggestions are
   * applied, so an unrecognised field never wipes something already entered.
   */
  const applyResume = (data: ParsedResume) => {
    if (data.fullName) setValue('fullName', data.fullName);
    if (data.headline) setValue('headline', data.headline);
    if (data.email) setValue('email', data.email);
    if (data.phone) setValue('phone', data.phone);
    if (data.location) setValue('location', data.location);
    if (data.website) setValue('website', data.website);

    if (data.links.length) {
      const existingLinks = watch('socialLinks') ?? [];
      const known = new Set(existingLinks.map((l) => l.url.toLowerCase()));
      const merged = [
        ...existingLinks,
        ...data.links
          .filter((l) => !known.has(l.url.toLowerCase()))
          .map((l) => ({ id: generateId(), label: l.label, url: l.url })),
      ];
      setValue('socialLinks', merged);
    }

    if (data.skills.length) {
      Alert.alert(
        'Skills found',
        `We spotted ${data.skills.length} skills: ${data.skills.join(', ')}.\n\nAdd them from the Skills tab.`,
      );
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    const socialLinks = values.socialLinks.map((l) => ({ ...l, id: l.id || generateId() }));
    await update({ ...values, socialLinks });
    router.back();
  };

  const initials = (fullName || 'You')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Profile' }} />
      <View style={[styles.avatarSection, { marginTop: theme.custom.spacing.lg }]}>
        {avatarUri ? (
          <Avatar.Image size={96} source={{ uri: avatarUri }} />
        ) : (
          <Avatar.Text size={96} label={initials} />
        )}
        <IconButton
          icon="camera"
          mode="contained"
          size={18}
          style={styles.editAvatarBtn}
          onPress={pickAvatar}
        />
      </View>

      <ResumeImportCard onApply={applyResume} />

      <View style={{ marginTop: theme.custom.spacing.lg }}>
        <FormTextInput control={control} name="fullName" label="Full name" />
        <FormTextInput control={control} name="headline" label="Headline" placeholder="e.g. Senior Frontend Engineer" />
        <FormTextInput control={control} name="bio" label="Bio" multiline numberOfLines={4} />
        <FormSelect control={control} name="availability" label="Availability" options={AVAILABILITY_OPTIONS} />
        <FormTextInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" />
        <FormTextInput control={control} name="phone" label="Phone (optional)" keyboardType="phone-pad" />
        <FormTextInput control={control} name="location" label="Location (optional)" />
        <FormTextInput control={control} name="website" label="Website (optional)" keyboardType="url" autoCapitalize="none" />
        <FormLinkList control={control} name="socialLinks" label="Social links" />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 24 }}>
          Save profile
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // paddingBottom reserves room for the overlapping edit button so it stays
  // inside the parent's bounds — a negative offset would render it fine but
  // leave it untappable (children outside parent bounds don't receive touches).
  avatarSection: { alignItems: 'center', position: 'relative', paddingBottom: 30 },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: '35%' },
});
