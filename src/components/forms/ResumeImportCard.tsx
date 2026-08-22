import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Portal, Modal, Checkbox, ActivityIndicator, HelperText } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useAppTheme } from '@theme/ThemeProvider';
import { extractResumeText } from '@lib/import/resumeTextExtractor';
import { parseResumeText, hasUsefulData, ParsedResume } from '@lib/import/resumeParser';
import { importResumeSections, undoImport } from '@lib/import/resumeImportService';
import { formatDateText } from '@utils/dateText';

interface ResumeImportCardProps {
  /** Applies the fields the user chose to keep. */
  onApply: (data: ParsedResume) => void;
}

type FieldKey =
  | 'fullName' | 'headline' | 'email' | 'phone' | 'location' | 'website' | 'links'
  | 'skills' | 'education' | 'certificates' | 'projects' | 'experience' | 'achievements';

const FIELD_LABELS: Record<FieldKey, string> = {
  fullName: 'Full name',
  headline: 'Headline',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  website: 'Website',
  links: 'Links',
  skills: 'Skills',
  education: 'Education',
  certificates: 'Certificates',
  projects: 'Projects',
  experience: 'Experience',
  achievements: 'Achievements',
};

/** Sections written to the Manage stores rather than the profile form. */
const MANAGE_KEYS: FieldKey[] = [
  'skills', 'education', 'certificates', 'projects', 'experience', 'achievements',
];

/**
 * Upload a resume and pre-fill the profile from it.
 *
 * Parsing is heuristic and runs fully offline, so nothing is written until the
 * user reviews the suggestions and confirms.
 */
export const ResumeImportCard: React.FC<ResumeImportCardProps> = ({ onApply }) => {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [importing, setImporting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<FieldKey, boolean>>({
    fullName: true,
    headline: true,
    email: true,
    phone: true,
    location: true,
    website: true,
    links: true,
    skills: true,
    education: true,
    certificates: true,
    projects: true,
    experience: true,
    achievements: true,
  });

  const pickResume = async () => {
    setError(null);
    setWarning(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setBusy(true);

      const extraction = await extractResumeText(asset.uri, asset.name ?? '');
      if (extraction.warning) setWarning(extraction.warning);

      if (!extraction.text.trim()) {
        setError(extraction.warning ?? 'Could not read any text from that file.');
        return;
      }

      const data = parseResumeText(extraction.text);
      if (!hasUsefulData(data)) {
        setError("Read the file, but couldn't recognise any profile details in it.");
        return;
      }

      // Surfaced in the review dialog so a partial import can be diagnosed
      // without guessing at what the file actually contained.
      const lineCount = extraction.text.split('\n').filter((l) => l.trim()).length;
      setDiagnostics(
        `Read ${extraction.text.length.toLocaleString()} characters in ${lineCount} line(s) from ${extraction.kind.toUpperCase()}.`,
      );
      setParsed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong reading that file.');
    } finally {
      setBusy(false);
    }
  };

  const availableFields = (Object.keys(FIELD_LABELS) as FieldKey[]).filter((key) => {
    if (!parsed) return false;
    const value = parsed[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  const apply = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      // Manage sections are persisted straight to their stores…
      const summary = await importResumeSections(parsed, {
        education: selected.education,
        certificates: selected.certificates,
        projects: selected.projects,
        skills: selected.skills,
        experience: selected.experience,
        achievements: selected.achievements,
      });

      // …while profile fields are handed back to fill the form on screen.
      onApply({
        fullName: selected.fullName ? parsed.fullName : undefined,
        headline: selected.headline ? parsed.headline : undefined,
        email: selected.email ? parsed.email : undefined,
        phone: selected.phone ? parsed.phone : undefined,
        location: selected.location ? parsed.location : undefined,
        website: selected.website ? parsed.website : undefined,
        links: selected.links ? parsed.links : [],
        skills: [],
        education: [],
        certificates: [],
        projects: [],
        experience: [],
        achievements: [],
      });

      setParsed(null);

      const lines = [
        summary.skills ? `${summary.skills} skills` : null,
        summary.education ? `${summary.education} education entries` : null,
        summary.experience ? `${summary.experience} experience entries` : null,
        summary.projects ? `${summary.projects} projects` : null,
        summary.certificates ? `${summary.certificates} certificates` : null,
        summary.achievements ? `${summary.achievements} achievements` : null,
      ].filter(Boolean);

      Alert.alert(
        'Import complete',
        [
          lines.length ? `Added:\n${lines.join('\n')}` : 'No new entries were added.',
          summary.skipped ? `\nSkipped ${summary.skipped} duplicate(s).` : '',
          // Dates are never guessed, so say which entries still need one
          // rather than letting a wrong date sit in the Manage screens.
          summary.missingDates
            ? `\n${summary.missingDates} entr${summary.missingDates === 1 ? 'y' : 'ies'} had no date in the resume — open them in Manage to add one.`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        summary.created.length
          ? [
              { text: 'Done', style: 'cancel' },
              {
                text: 'Undo import',
                style: 'destructive',
                onPress: () => {
                  void undoImport(summary.created);
                },
              },
            ]
          : undefined,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import resume sections.');
    } finally {
      setImporting(false);
    }
  };

  /** How many entries a section will import, for the checkbox label. */
  const count = (key: FieldKey): number => {
    if (!parsed) return 0;
    const value = parsed[key];
    return Array.isArray(value) ? value.length : 0;
  };

  /** "Jan 2021 – Present", or a note when the resume stated no date. */
  const range = (start?: string, end?: string, isCurrent?: boolean): string => {
    if (!start && !end && !isCurrent) return 'no date found';
    const from = start ? formatDateText(start, false) : '?';
    const to = isCurrent ? 'Present' : end ? formatDateText(end, false) : '?';
    return `${from} – ${to}`;
  };

  /**
   * Every entry is listed, not just a count — the point of this dialog is that
   * the user can see each item that will be created and spot anything the
   * parser got wrong before it is written.
   */
  const preview = (key: FieldKey): string => {
    if (!parsed) return '';
    switch (key) {
      case 'links':
        return parsed.links.map((l) => `${l.label} — ${l.url}`).join('\n');
      case 'skills':
        return parsed.skills.join(', ');
      case 'education':
        return parsed.education
          .map((e) => `• ${e.degree}${e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''} — ${e.institution} (${range(e.startDate, e.endDate, e.isCurrent)})`)
          .join('\n');
      case 'certificates':
        return parsed.certificates
          .map((c) => `• ${c.name} — ${c.issuingOrg}${c.issueDate ? ` (${formatDateText(c.issueDate, false)})` : ' (no date found)'}`)
          .join('\n');
      case 'projects':
        return parsed.projects
          .map((p) => `• ${p.title}${p.techStack.length ? ` — ${p.techStack.join(', ')}` : ''}`)
          .join('\n');
      case 'experience':
        return parsed.experience
          .map((e) => `• ${e.role} — ${e.company} (${range(e.startDate, e.endDate, e.isCurrent)})`)
          .join('\n');
      case 'achievements':
        return parsed.achievements.map((a) => `• ${a.title}`).join('\n');
      default:
        return String(parsed[key] ?? '');
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.custom.radius.lg },
      ]}
    >
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        Import from resume
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        Upload a PDF, DOCX or TXT and we'll suggest values for your profile. Nothing is saved until you confirm.
      </Text>

      <Button
        mode="contained-tonal"
        icon="file-upload-outline"
        onPress={pickResume}
        disabled={busy}
        style={{ marginTop: 12, alignSelf: 'flex-start' }}
      >
        {busy ? 'Reading…' : 'Upload resume'}
      </Button>

      {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
      {warning && !error ? (
        <HelperText type="info" visible>
          {warning}
        </HelperText>
      ) : null}

      <Portal>
        <Modal
          visible={!!parsed}
          onDismiss={() => setParsed(null)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface, borderRadius: theme.custom.radius.lg },
          ]}
        >
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            Review what we found
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Untick anything you don't want to import.
          </Text>
          {diagnostics ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, opacity: 0.7 }}>
              {diagnostics}
            </Text>
          ) : null}

          <ScrollView style={styles.reviewScroll}>
            {availableFields.map((key) => (
              <View key={key} style={styles.fieldBlock}>
                <Checkbox.Item
                  label={
                    MANAGE_KEYS.includes(key)
                      ? `${FIELD_LABELS[key]} (${count(key)})  ·  saves to Manage`
                      : FIELD_LABELS[key]
                  }
                  status={selected[key] ? 'checked' : 'unchecked'}
                  onPress={() => setSelected((s) => ({ ...s, [key]: !s[key] }))}
                  position="leading"
                  labelStyle={styles.checkLabel}
                  style={styles.checkItem}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                  {preview(key)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button onPress={() => setParsed(null)} disabled={importing}>
              Cancel
            </Button>
            <Button mode="contained" onPress={apply} loading={importing} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginTop: 16 },
  modal: { margin: 24, padding: 20, maxHeight: '80%' },
  reviewScroll: { maxHeight: 360 },
  fieldBlock: { marginBottom: 10 },
  checkItem: { paddingVertical: 0, paddingHorizontal: 0 },
  checkLabel: { textAlign: 'left', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
