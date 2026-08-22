import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { useAppTheme } from '@theme/ThemeProvider';
import { useNotesStore } from '@store/notesStore';

/**
 * Falls back to the note's first meaningful line when the title is left blank,
 * so the list never shows a row of "Untitled note".
 */
export function deriveNoteTitle(content: string): string {
  const firstLine = content
    .split(/\r?\n/)
    // A leading markdown heading marker is punctuation, not part of the title.
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find(Boolean);
  return firstLine ? firstLine.slice(0, 80) : 'Untitled note';
}

/** Three actions have to share the header's right slot without crowding. */
const ICON_SIZE = 20;

export default function NoteEditorScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id || id === 'new';
  const { getById, add, edit, remove } = useNotesStore();
  const existing = !isNew ? getById(id as string) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [pinned, setPinned] = useState(existing?.pinned ?? false);
  const [previewMode, setPreviewMode] = useState(false);
  const [noteId, setNoteId] = useState<string | undefined>(existing?.id);

  // Autosave once there is something worth saving.
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!title.trim() && !content.trim()) return;
      const payload = {
        // A typed title wins; otherwise the first line stands in for it.
        title: title.trim() || deriveNoteTitle(content),
        content,
        // Tags are not editable here any more. An existing note keeps whatever
        // it already carried rather than being silently stripped on save.
        tags: existing?.tags ?? [],
        pinned,
      };
      if (noteId) {
        await edit(noteId, payload);
      } else {
        const created = await add(payload);
        setNoteId(created.id);
      }
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, pinned]);

  const onDelete = async () => {
    if (noteId) await remove(noteId);
    router.back();
  };

  return (
    // The editor fills the screen rather than scrolling: the writing area is
    // the page, and a multiline input scrolls its own overflow.
    <Screen scroll={false}>
      <Stack.Screen
        options={{
          title: isNew && !noteId ? 'New Note' : 'Edit Note',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon={pinned ? 'pin' : 'pin-outline'}
                size={ICON_SIZE}
                style={styles.headerIcon}
                accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
                onPress={() => setPinned((p) => !p)}
              />
              <IconButton
                icon={previewMode ? 'pencil-outline' : 'eye-outline'}
                size={ICON_SIZE}
                style={styles.headerIcon}
                accessibilityLabel={previewMode ? 'Edit note' : 'Preview note'}
                onPress={() => setPreviewMode((p) => !p)}
              />
              {noteId ? (
                <IconButton
                  icon="delete-outline"
                  size={ICON_SIZE}
                  style={styles.headerIcon}
                  accessibilityLabel="Delete note"
                  onPress={onDelete}
                />
              ) : null}
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        {previewMode ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewPad}>
            <Markdown
              style={{
                body: { color: theme.colors.onSurface, fontSize: 16, lineHeight: 24 },
                heading1: { color: theme.colors.onSurface },
                heading2: { color: theme.colors.onSurface },
                code_inline: { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface },
                code_block: { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface },
                fence: { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface },
                link: { color: theme.colors.primary },
                bullet_list_icon: { color: theme.colors.onSurfaceVariant },
              }}
            >
              {`${title.trim() ? `# ${title.trim()}\n\n` : ''}${content || '*Nothing to preview yet.*'}`}
            </Markdown>
          </ScrollView>
        ) : (
          <>
            <RNTextInput
              placeholder="Title"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={title}
              onChangeText={setTitle}
              autoFocus={isNew && !noteId}
              returnKeyType="next"
              style={[styles.title, { color: theme.colors.onSurface }]}
            />

            <RNTextInput
              placeholder="Start writing"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              style={[styles.body, { color: theme.colors.onSurface }]}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // Paper's IconButton carries its own 6pt margin and a 40pt touch target.
    // Left alone, three of them overflow the header's right slot and sit off
    // its vertical centre.
    marginRight: -6,
  },
  headerIcon: { margin: 0, width: 34, height: 34 },

  title: { fontSize: 26, fontWeight: '700', paddingTop: 4, paddingBottom: 6 },
  body: { flex: 1, fontSize: 16, lineHeight: 24, paddingTop: 4 },

  previewPad: { paddingTop: 12, paddingBottom: 24 },
});
