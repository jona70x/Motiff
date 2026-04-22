/**
 * Central Lucide icon map — import from here so every screen uses the same
 * icon for the same concept and tree-shaking eliminates unused icons.
 */
import {
  House,
  ListTodo,
  BookOpen,
  TrendingUp,
  Plus,
  Settings,
  UserCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Play,
  Pause,
  X,
  Clock,
  type LucideIcon,
} from "lucide-react-native";

export type { LucideIcon };

export const Icons = {
  // Tab bar
  today:    House,
  plan:     ListTodo,
  courses:  BookOpen,
  progress: TrendingUp,

  // Actions
  add:      Plus,
  settings: Settings,
  profile:  UserCircle,
  refresh:  RotateCcw,
  check:    Check,
  play:     Play,
  pause:    Pause,
  close:    X,

  // UI chrome
  chevronDown:  ChevronDown,
  chevronLeft:  ChevronLeft,
  chevronRight: ChevronRight,
  clock:        Clock,
} as const;
