import React from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { FormTextInput } from '@components/forms/FormTextInput';
import { FormDateField } from '@components/forms/FormDateField';
import { useAppTheme } from '@theme/ThemeProvider';
import { useCertificatesStore } from '@store/certificatesStore';
import { certificateSchema, CertificateFormValues } from '@lib/validators/certificateSchema';

export default function CertificateFormScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getById, add, edit, remove } = useCertificatesStore();
  const existing = id ? getById(id) : undefined;

  const { control, handleSubmit } = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      name: existing?.name ?? '',
      issuingOrg: existing?.issuingOrg ?? '',
      issueDate: existing?.issueDate ?? new Date().toISOString(),
      expiryDate: existing?.expiryDate,
      credentialId: existing?.credentialId ?? '',
      credentialUrl: existing?.credentialUrl ?? '',
    },
  });

  const onSubmit = async (values: CertificateFormValues) => {
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
      <Stack.Screen options={{ title: existing ? 'Edit Certificate' : 'Add Certificate' }} />
      <View style={{ marginTop: theme.custom.spacing.md }}>
        <FormTextInput control={control} name="name" label="Certificate name" placeholder="e.g. AWS Solutions Architect" />
        <FormTextInput control={control} name="issuingOrg" label="Issuing organization" placeholder="e.g. Amazon Web Services" />
        <FormDateField control={control} name="issueDate" label="Issue date" />
        <FormDateField control={control} name="expiryDate" label="Expiry date (optional)" allowPresent />
        <FormTextInput control={control} name="credentialId" label="Credential ID (optional)" />
        <FormTextInput control={control} name="credentialUrl" label="Credential URL (optional)" keyboardType="url" autoCapitalize="none" />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 8, marginBottom: 12 }}>
          {existing ? 'Save changes' : 'Add certificate'}
        </Button>
        {existing ? (
          <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
            Delete certificate
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
