import React, { memo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { fontFamilies } from '@/theme/typography';
import type { QuestItem } from '@/app/(tabs)/index';

function QuestHeaderImage({ quest }: { quest: QuestItem }) {
  if (quest.image) {
    return (
      <ExpoImage
        source={quest.image}
        style={[styles.questImage, quest.imageStyle, styles.questImageBg]}
        cachePolicy="memory-disk"
        transition={200}
        contentFit="cover"
        recyclingKey={quest.id}
      />
    );
  }
  return (
    <LinearGradient
      colors={['#1F1F24', '#0E0E11']}
      style={styles.questImagePlaceholder}
    />
  );
}

function AnimatedTickButton({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = (e: any) => {
    e.stopPropagation();
    onPress();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 40, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.creamSquareTickButton, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark" size={16} color="#262626" />
      </Animated.View>
    </Pressable>
  );
}

function AnimatedWrongButton({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = (e: any) => {
    e.stopPropagation();
    onPress();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 40, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.redSquareWrongButton, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="close" size={16} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

function getQuestTargetValue(quest: QuestItem, proteinGoal?: number | null): string | undefined {
  if (quest.targetValue) return quest.targetValue;
  if (quest.title === 'Protein Goal' && proteinGoal) return `${proteinGoal}g`;
  return undefined;
}

export interface QuestListCardProps {
  quest: QuestItem;
  variant: 'todo' | 'done' | 'skipped';
  /** Only needed to resolve the "Protein Goal" quest's dynamic target text. */
  proteinGoal?: number | null;
  onComplete: (questId: string) => void;
  onSkip: (questId: string) => void;
  onReset: (questId: string) => void;
}

function QuestListCardComponent({
  quest,
  variant,
  proteinGoal,
  onComplete,
  onSkip,
  onReset,
}: QuestListCardProps) {
  const targetValue = getQuestTargetValue(quest, proteinGoal);
  const typeLabel = quest.type === 'weekly' ? 'Weekly' : 'Routine';

  return (
    <View style={[styles.questCard, variant === 'skipped' && styles.questCardSkipped]}>
      <View style={styles.questImageWrapper}>
        <QuestHeaderImage quest={quest} />

        {variant === 'todo' && (
          <View style={styles.topRightActionsCol}>
            <View style={styles.xpBadgeInline}>
              <Text style={styles.xpBadgeText}>+{quest.xpReward} XP</Text>
            </View>
            {quest.showTickButton !== false && (
              <AnimatedTickButton onPress={() => onComplete(quest.id)} />
            )}
            {quest.showWrongButton !== false && (
              <AnimatedWrongButton onPress={() => onSkip(quest.id)} />
            )}
          </View>
        )}

        {variant === 'done' && (
          <View style={styles.topRightActionsCol}>
            <View style={styles.xpBadgeInline}>
              <Text style={styles.xpBadgeText}>+{quest.xpReward} XP</Text>
            </View>
          </View>
        )}

        {variant === 'skipped' && (
          <View style={[styles.xpBadgeTopRight, styles.skippedBadgeContainer]}>
            <Ionicons name="play-skip-forward" size={14} color="#A1A1AA" />
            <Text style={[styles.xpBadgeText, { color: '#A1A1AA' }]}>SKIPPED</Text>
          </View>
        )}
      </View>

      <View style={styles.questBody}>
        <View style={styles.questTitleCol}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{quest.category}</Text>
            </View>
            <View style={styles.routineBadgeInline}>
              <Ionicons name="repeat-outline" size={12} color="#A1A1AA" />
              <Text style={styles.routineBadgeText}>{typeLabel}</Text>
            </View>
          </View>
          <Text style={styles.questTitle}>{quest.title}</Text>
        </View>

        {variant === 'skipped' ? (
          <TouchableOpacity style={styles.undoButton} onPress={() => onReset(quest.id)}>
            <Ionicons name="refresh-outline" size={16} color="#A1A1AA" />
            <Text style={styles.undoButtonText}>Reset</Text>
          </TouchableOpacity>
        ) : (
          targetValue && (
            <View style={styles.targetValueBox}>
              <Text style={styles.targetValueText}>{targetValue}</Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

// The parent screen (Home) holds ~16 independent pieces of state (modals,
// toasts, animation values, ...) and re-renders often; without memo every
// quest row would re-render on every one of those, even the ones whose own
// `quest` data never changed. React.memo's default shallow prop comparison
// is enough here because `quest` keeps a stable object reference for every
// unaffected item (setQuests only replaces the one that changed) and
// onComplete/onSkip/onReset are stabilized in the parent via useCallback —
// see handleOpenQuestActions/handleDirectSkip/handleResetQuest.
export const QuestListCard = memo(QuestListCardComponent);

const styles = StyleSheet.create({
  questCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#0E0E11',
  },
  questCardSkipped: {
    opacity: 0.55,
  },
  questImageWrapper: {
    height: 115,
    position: 'relative',
  },
  questImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  questImageBg: {
    backgroundColor: '#1A1A1F',
  },
  questImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  topRightActionsCol: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'flex-end',
    gap: 6,
  },
  xpBadgeInline: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  xpBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  xpBadgeTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  skippedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    borderColor: '#3F3F46',
  },
  questBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: '#0E0E11',
  },
  questTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  categoryPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#A1A1AA',
    letterSpacing: 0.8,
  },
  routineBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routineBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#A1A1AA',
    letterSpacing: 0.5,
  },
  questTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  targetValueBox: {
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetValueText: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  undoButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    color: '#A1A1AA',
  },
  creamSquareTickButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#E5D7C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redSquareWrongButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
