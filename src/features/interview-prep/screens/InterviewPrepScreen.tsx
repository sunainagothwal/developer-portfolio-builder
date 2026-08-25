import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, HelperText, ProgressBar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { SectionHeader } from '@components/common/SectionHeader';
import { EmptyState } from '@components/common/EmptyState';
import { Badge } from '@components/common/Badge';
import { useAppTheme, AppTheme } from '@theme/ThemeProvider';
import { extractResumeText } from '@lib/import/resumeTextExtractor';
import { parseResumeText, hasUsefulData, ParsedResume } from '@lib/import/resumeParser';
import {
  generateMockInterviewQuestions,
  flattenInterviewQuestions,
  InterviewQuestionItem,
} from '@lib/interview/mockInterviewQuestions';

type Stage = 'setup' | 'session' | 'summary';
type Rating = 'strong' | 'okay' | 'weak';

interface AnsweredQuestion extends InterviewQuestionItem {
  answer: string;
  seconds: number;
}

const RATING_META: Record<Rating, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  strong: { label: 'Nailed it', icon: 'check-circle-outline' },
  okay: { label: 'Okay', icon: 'minus-circle-outline' },
  weak: { label: 'Needs work', icon: 'alert-circle-outline' },
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Small circular 1/2 marker for the setup steps, filled in once that step is done. */
function StepBadge({ n, done, theme }: { n: number; done: boolean; theme: AppTheme }) {
  return (
    <View
      style={[
        styles.stepBadge,
        {
          borderRadius: theme.custom.radius.pill,
          backgroundColor: done ? theme.custom.brand.success : theme.colors.primaryContainer,
        },
      ]}
    >
      {done ? (
        <MaterialCommunityIcons name="check" size={13} color="#fff" />
      ) : (
        <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700', fontSize: 12 }}>{n}</Text>
      )}
    </View>
  );
}

/** Pulsing dot that marks the session as "live" while a question is on the clock. */
function LiveDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.25, { duration: 700 }), -1, true);
    return () => {
      opacity.value = 1;
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.liveDot, { backgroundColor: color }, animatedStyle]} />;
}

/**
 * Resume upload + target company/role in, a live one-question-at-a-time mock
 * interview session out. Everything runs on-device: the resume is parsed the
 * same way the onboarding import does, and the questions come from a local
 * heuristic bank rather than a network call. There is no AI grading — the
 * value is in rehearsing under a running clock and reviewing your own
 * answers afterward, the way a real interview loop feels.
 */
export default function InterviewPrepScreen() {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [company, setCompany] = useState('');
  const [jobRole, setJobRole] = useState('');

  const [stage, setStage] = useState<Stage>('setup');
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [tick, setTick] = useState(0);
  const questionStartTick = useRef(0);

  useEffect(() => {
    if (stage !== 'session') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [stage]);

  const pickResume = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setBusy(true);

      const extraction = await extractResumeText(asset.uri, asset.name ?? '');
      if (!extraction.text.trim()) {
        setError(extraction.warning ?? 'Could not read any text from that file.');
        return;
      }

      const data = parseResumeText(extraction.text);
      if (!hasUsefulData(data)) {
        setError("Read the file, but couldn't recognise any details in it.");
        return;
      }

      setParsed(data);
      setResumeName(asset.name ?? 'Resume');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong reading that file.');
    } finally {
      setBusy(false);
    }
  };

  const onStart = () => {
    if (!parsed) return;
    const groups = generateMockInterviewQuestions(parsed, company, jobRole);
    const flat = flattenInterviewQuestions(groups);
    setQuestions(flat);
    setCurrentIndex(0);
    setCurrentAnswer('');
    setAnswers([]);
    setRatings({});
    setTick(0);
    questionStartTick.current = 0;
    setStage('session');
  };

  const commitCurrentAnswer = (): AnsweredQuestion => {
    const item = questions[currentIndex];
    const seconds = Math.max(1, tick - questionStartTick.current);
    return { ...item, answer: currentAnswer.trim(), seconds };
  };

  const onNext = () => {
    const answered = commitCurrentAnswer();
    const nextAnswers = [...answers, answered];
    setAnswers(nextAnswers);
    if (currentIndex + 1 >= questions.length) {
      setStage('summary');
      return;
    }
    setCurrentIndex((i) => i + 1);
    setCurrentAnswer('');
    questionStartTick.current = tick;
  };

  const onEndEarly = () => {
    const answered = commitCurrentAnswer();
    setAnswers((prev) => [...prev, answered]);
    setStage('summary');
  };

  const onRestart = () => {
    setStage('setup');
    setQuestions([]);
    setAnswers([]);
    setRatings({});
  };

  const trimmedCompany = company.trim();
  const trimmedRole = jobRole.trim();
  const resumeDone = Boolean(parsed);
  const detailsDone = trimmedCompany.length > 0 && trimmedRole.length > 0;
  const canGenerate = resumeDone && detailsDone;
  const isLastQuestion = currentIndex + 1 >= questions.length;
  const currentQuestion = questions[currentIndex];
  const currentElapsed = tick - questionStartTick.current;
  const totalElapsed = answers.reduce((sum, a) => sum + a.seconds, 0) + (stage === 'session' ? currentElapsed : 0);

  const previewCount = useMemo(() => {
    if (!parsed || !canGenerate) return 0;
    return flattenInterviewQuestions(generateMockInterviewQuestions(parsed, company, jobRole)).length;
  }, [parsed, company, jobRole, canGenerate]);

  const ratingTone: Record<Rating, string> = {
    strong: theme.custom.brand.success,
    okay: theme.custom.brand.warning,
    weak: theme.custom.brand.danger,
  };

  const ratingCounts = { strong: 0, okay: 0, weak: 0 } as Record<Rating, number>;
  Object.values(ratings).forEach((r) => {
    ratingCounts[r] += 1;
  });

  return (
    <Screen edges={['top']}>
      {stage === 'setup' ? (
        <>
          <SectionHeader
            title="Mock Interview Prep"
            subtitle="Upload your resume and a target company to start a live practice session"
          />

          <AppCard>
            <View style={styles.stepHeader}>
              <StepBadge n={1} done={resumeDone} theme={theme} />
              <Text variant="titleSmall" style={{ marginLeft: 8 }}>
                Your resume
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Upload a PDF, DOCX or TXT resume — read on this device only, never uploaded anywhere.
            </Text>

            <Button
              mode="contained-tonal"
              icon="file-upload-outline"
              onPress={pickResume}
              disabled={busy}
              style={{ alignSelf: 'flex-start' }}
            >
              {busy ? 'Reading…' : resumeName ? 'Choose a different file' : 'Upload resume'}
            </Button>

            {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}

            {parsed && resumeName ? (
              <View
                style={[
                  styles.resumeSummary,
                  {
                    backgroundColor: theme.custom.brand.success + '14',
                    borderColor: theme.custom.brand.success + '33',
                    borderRadius: theme.custom.radius.md,
                  },
                ]}
              >
                <MaterialCommunityIcons name="file-check-outline" size={18} color={theme.custom.brand.success} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {resumeName}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {parsed.skills.length} skills · {parsed.experience.length} experience entr{parsed.experience.length === 1 ? 'y' : 'ies'} detected
                  </Text>
                </View>
              </View>
            ) : null}
          </AppCard>

          <AppCard>
            <View style={styles.stepHeader}>
              <StepBadge n={2} done={detailsDone} theme={theme} />
              <Text variant="titleSmall" style={{ marginLeft: 8 }}>
                Target company &amp; role
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Questions are tailored to this company and role plus the skills and experience on your resume.
            </Text>
            <TextInput
              mode="outlined"
              label="Company name"
              placeholder="e.g. Acme Corp"
              value={company}
              onChangeText={setCompany}
            />
            <TextInput
              mode="outlined"
              label="Job role"
              placeholder="e.g. Senior Frontend Engineer"
              value={jobRole}
              onChangeText={setJobRole}
              style={{ marginTop: 12 }}
            />
          </AppCard>

          <Button
            mode="contained"
            icon="play-circle-outline"
            onPress={onStart}
            disabled={!canGenerate}
            style={{ marginTop: theme.custom.spacing.sm, marginBottom: theme.custom.spacing.lg }}
          >
            Start mock interview
          </Button>

          {canGenerate ? (
            <AppCard
              style={{
                backgroundColor: theme.colors.primaryContainer,
                borderColor: 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={theme.colors.onPrimaryContainer} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 10, flex: 1 }}>
                Ready — {previewCount} tailored question{previewCount === 1 ? '' : 's'} for the {trimmedRole} role at{' '}
                {trimmedCompany}.
              </Text>
            </AppCard>
          ) : (
            <EmptyState
              icon="head-question-outline"
              title={resumeDone ? 'Add a company and role' : 'Ready when you are'}
              description={
                resumeDone
                  ? 'Fill in step 2 above to tailor your questions, then start a timed, one-question-at-a-time practice session.'
                  : 'Upload a resume and enter a company and role above, then start a timed, one-question-at-a-time practice session.'
              }
            />
          )}
        </>
      ) : null}

      {stage === 'session' && currentQuestion ? (
        <>
          <View style={styles.sessionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
                Question {currentIndex + 1} of {questions.length}
              </Text>
              <Badge label={currentQuestion.category} tone="primary" style={{ marginTop: 6 }} />
            </View>
            <View style={styles.liveRow}>
              <LiveDot color={theme.custom.brand.danger} />
              <Text variant="labelMedium" style={{ color: theme.custom.brand.danger, marginLeft: 6, fontWeight: '700' }}>
                LIVE
              </Text>
            </View>
          </View>

          <View style={styles.timerRow}>
            <ProgressBar
              progress={(currentIndex + (isLastQuestion ? 1 : 0.5)) / questions.length}
              color={theme.colors.primary}
              style={styles.progress}
            />
            <View style={styles.timerBadge}>
              <MaterialCommunityIcons name="timer-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text
                style={[
                  theme.custom.typography.mono,
                  { fontSize: 14, color: theme.colors.onSurfaceVariant, marginLeft: 4 },
                ]}
              >
                {formatDuration(currentElapsed)}
              </Text>
            </View>
          </View>

          <AppCard style={{ borderLeftWidth: 4, borderLeftColor: theme.colors.primary }}>
            <MaterialCommunityIcons
              name="format-quote-open"
              size={20}
              color={theme.colors.primary}
              style={{ marginBottom: 4 }}
            />
            <Text variant="titleMedium" style={{ lineHeight: 26 }}>
              {currentQuestion.question}
            </Text>
          </AppCard>

          <AppCard>
            <View style={styles.stepHeader}>
              <MaterialCommunityIcons name="microphone-outline" size={18} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleSmall" style={{ marginLeft: 8 }}>
                Say it out loud, then jot down the key points you covered
              </Text>
            </View>
            <TextInput
              mode="outlined"
              placeholder="What did you say? (optional — helps when you review afterward)"
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              multiline
              numberOfLines={6}
              style={{ minHeight: 120, marginTop: 4 }}
            />
          </AppCard>

          <View style={styles.sessionActions}>
            <Button
              mode="outlined"
              onPress={onEndEarly}
              textColor={theme.custom.brand.danger}
              style={[styles.sessionButton, { borderColor: theme.custom.brand.danger + '66' }]}
            >
              End interview
            </Button>
            <Button
              mode="contained"
              icon={isLastQuestion ? 'flag-checkered' : 'arrow-right'}
              onPress={onNext}
              style={styles.sessionButton}
            >
              {isLastQuestion ? 'Finish interview' : 'Next question'}
            </Button>
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12 }}>
            Total time so far: {formatDuration(totalElapsed)}
          </Text>
        </>
      ) : null}

      {stage === 'summary' ? (
        <>
          <SectionHeader title="Interview complete" subtitle="Here's how your session went" />

          <AppCard style={{ backgroundColor: theme.colors.primaryContainer, borderColor: 'transparent' }}>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text variant="headlineMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
                  {answers.length}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  question{answers.length === 1 ? '' : 's'} answered
                </Text>
              </View>
              <View style={styles.summaryStat}>
                <Text
                  style={[
                    theme.custom.typography.mono,
                    { fontSize: 24, fontWeight: '700', color: theme.colors.onPrimaryContainer },
                  ]}
                >
                  {formatDuration(totalElapsed)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  total time
                </Text>
              </View>
            </View>

            {answers.length > 0 ? (
              <View style={styles.ratingTallyRow}>
                {(['strong', 'okay', 'weak'] as Rating[]).map((r) => (
                  <View key={r} style={styles.ratingTally}>
                    <MaterialCommunityIcons name={RATING_META[r].icon} size={16} color={ratingTone[r]} />
                    <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 4 }}>
                      {ratingCounts[r]} {RATING_META[r].label.toLowerCase()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </AppCard>

          {answers.map((a, i) => (
            <AppCard key={`${a.category}-${i}`}>
              <View style={styles.summaryHeader}>
                <Badge label={a.category} tone="primary" small />
                <View style={styles.timerBadge}>
                  <MaterialCommunityIcons name="timer-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    {formatDuration(a.seconds)}
                  </Text>
                </View>
              </View>
              <Text variant="bodyMedium" style={{ marginTop: 8, fontWeight: '600' }}>
                {a.question}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  marginTop: 6,
                  color: a.answer ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                  fontStyle: a.answer ? 'normal' : 'italic',
                }}
              >
                {a.answer || 'No notes taken for this one.'}
              </Text>

              <View style={styles.ratingRow}>
                {(['strong', 'okay', 'weak'] as Rating[]).map((r) => {
                  const selected = ratings[i] === r;
                  return (
                    <Chip
                      key={r}
                      compact
                      icon={() => (
                        <MaterialCommunityIcons
                          name={RATING_META[r].icon}
                          size={15}
                          color={selected ? ratingTone[r] : theme.colors.onSurfaceVariant}
                        />
                      )}
                      selected={selected}
                      onPress={() => setRatings((prev) => ({ ...prev, [i]: r }))}
                      style={[
                        styles.ratingChip,
                        selected ? { backgroundColor: ratingTone[r] + '26' } : { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                      textStyle={{ color: selected ? ratingTone[r] : theme.colors.onSurfaceVariant, fontSize: 12 }}
                    >
                      {RATING_META[r].label}
                    </Chip>
                  );
                })}
              </View>
            </AppCard>
          ))}

          <Button
            mode="contained"
            icon="refresh"
            onPress={onRestart}
            style={{ marginTop: theme.custom.spacing.sm, marginBottom: theme.custom.spacing.lg }}
          >
            Start another mock interview
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepBadge: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  resumeSummary: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 12, borderWidth: 1 },
  sessionHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  progress: { flex: 1, height: 8, borderRadius: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center' },
  sessionActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  sessionButton: { flex: 1 },
  summaryStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center' },
  ratingTallyRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  ratingTally: { flexDirection: 'row', alignItems: 'center' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ratingChip: { height: 30 },
});
