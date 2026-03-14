export type Database = {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string;
          admin_id: string;
          name: string;
          season_name: string;
          code: string;
          num_survivors: number;
          num_picks_per_player: number;
          max_times_drafted: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          name: string;
          season_name: string;
          code: string;
          num_survivors?: number;
          num_picks_per_player?: number;
          max_times_drafted?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          name?: string;
          season_name?: string;
          code?: string;
          num_survivors?: number;
          num_picks_per_player?: number;
          max_times_drafted?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      survivors: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          tribe: string | null;
          status: string;
          eliminated_episode: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          name: string;
          tribe?: string | null;
          status?: string;
          eliminated_episode?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          name?: string;
          tribe?: string | null;
          status?: string;
          eliminated_episode?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          draft_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          name: string;
          draft_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          name?: string;
          draft_order?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      draft_state: {
        Row: {
          id: string;
          league_id: string;
          status: string;
          current_round: number;
          current_pick_index: number;
          draft_order: string[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          status?: string;
          current_round?: number;
          current_pick_index?: number;
          draft_order?: string[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          status?: string;
          current_round?: number;
          current_pick_index?: number;
          draft_order?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      draft_picks: {
        Row: {
          id: string;
          league_id: string;
          player_id: string;
          survivor_id: string;
          round: number;
          pick_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          player_id: string;
          survivor_id: string;
          round: number;
          pick_number: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          player_id?: string;
          survivor_id?: string;
          round?: number;
          pick_number?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      scoring_rules: {
        Row: {
          id: string;
          league_id: string;
          event_name: string;
          points: number;
          description: string | null;
          is_variable: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          event_name: string;
          points: number;
          description?: string | null;
          is_variable?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          event_name?: string;
          points?: number;
          description?: string | null;
          is_variable?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          id: string;
          league_id: string;
          episode_number: number;
          title: string | null;
          is_scored: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          episode_number: number;
          title?: string | null;
          is_scored?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          episode_number?: number;
          title?: string | null;
          is_scored?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      episode_events: {
        Row: {
          id: string;
          episode_id: string;
          survivor_id: string;
          scoring_rule_id: string;
          value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          episode_id: string;
          survivor_id: string;
          scoring_rule_id: string;
          value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          survivor_id?: string;
          scoring_rule_id?: string;
          value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          episode_id: string;
          player_id: string;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          episode_id: string;
          player_id: string;
          points: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          player_id?: string;
          points?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience types
export type League = Database["public"]["Tables"]["leagues"]["Row"];
export type Survivor = Database["public"]["Tables"]["survivors"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type DraftState = Database["public"]["Tables"]["draft_state"]["Row"];
export type DraftPick = Database["public"]["Tables"]["draft_picks"]["Row"];
export type ScoringRule = Database["public"]["Tables"]["scoring_rules"]["Row"];
export type Episode = Database["public"]["Tables"]["episodes"]["Row"];
export type EpisodeEvent = Database["public"]["Tables"]["episode_events"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
