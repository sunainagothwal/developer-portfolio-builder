import React from 'react';
import { StyleSheet, View, ViewStyle, RefreshControl, ScrollViewProps, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  /**
   * Safe-area edges to pad. Empty by default: most screens sit under the
   * navigator's header, which has already consumed the top inset, so adding it
   * again opened a band of dead space between the header and the content.
   * Screens with no header (the tabs, and any with headerShown: false) pass
   * ['top'] themselves.
   */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scrollProps?: Partial<ScrollViewProps>;
  /**
   * A floating control such as a FAB.
   *
   * It must be rendered here rather than passed in `children`: children of a
   * scrolling screen live inside the ScrollView, where `position: absolute`
   * resolves against the *content*, not the viewport. A short list therefore
   * parked the button on top of its own last card instead of at the bottom of
   * the screen.
   */
  floatingAction?: React.ReactNode;
}

/**
 * Standard screen wrapper. Handles safe-area, background color, optional
 * scroll + pull-to-refresh, and consistent horizontal padding.
 * Every feature screen should be wrapped in this for visual consistency.
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  padded = true,
  edges = [],
  scrollProps,
  floatingAction,
}) => {
  const theme = useAppTheme();

  const content = (
    <View
      style={[
        // Non-scrolling screens need the wrapper to fill the available height,
        // otherwise children relying on `flex: 1` collapse to their natural
        // size and overlap each other. Scrolling screens must NOT have this —
        // the content has to be free to grow taller than the viewport.
        !scroll && styles.flex,
        padded && { paddingHorizontal: theme.custom.spacing.lg },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingBottom: theme.custom.spacing.huge }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          // Without this, a tap on any button while the keyboard is open is
          // consumed dismissing the keyboard instead of firing onPress — which
          // makes "+ Add" buttons appear dead until you tap them a second time.
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            ) : undefined
          }
          {...scrollProps}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
      {/* Sibling of the scroller, so it anchors to the screen. */}
      {floatingAction}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
