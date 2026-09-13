export type WeekStatusDay = {
  date: string;
  day: string;
  status: 'DONE' | 'COMPLETED' | 'MISSED' | 'FAILED' | 'SKIPPED' | 'NOT_STARTED' | 'REST' | 'FREEZE' | string;
};

export type WeekStatus = {
  week_start: string;
  week_end: string;
  days: WeekStatusDay[];
};

export type User = {
  id: string;
  displayName: string;
  name?: string;
  email: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  height?: number;
  weight?: number;
  date_of_birth?: string;
  dob?: string;
  birthday?: string;
  daily_protein_goal?: number | null;
  auth_provider?: string;
  authProvider?: string;
  provider?: string;
  onboarding_done?: boolean;
  weeklyStreak?: number;
  completedDaysCount?: number;
  user_progression?: {
    id?: string;
    user_id?: string;
    total_xp?: number;
    current_level?: number;
    daily_streak?: number;
    weekly_streak?: number;
    longest_streak?: number;
    streak_multiplier?: number;
    consecutive_miss_days?: number;
    last_active_date?: string;
    streak_lives?: number;
    updated_at?: string;
    current_level_name?: string;
    current_level_title?: string;
    rank_name?: string;
    rank?: string;
    next_level_rank?: string;
    next_level_rank_name?: string;
    next_level_xp_required?: number;
    next_level_required_xp?: number;
  };
  week_status?: WeekStatus;
  badges?: Array<{
    badge_id?: number;
    name?: string;
    description?: string;
    image_url?: string | null;
    badge_type?: string;
    earned_at?: string;
    milestone_days?: number;
  }>;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
