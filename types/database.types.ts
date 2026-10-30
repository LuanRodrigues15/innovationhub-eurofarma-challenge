export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      idea_rejections: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_rejections_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_rejections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          content: string
          created_at: string
          description: string
          id: string
          sector_id: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          description: string
          id?: string
          sector_id?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string
          id?: string
          sector_id?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          ai_score: number
          approved_by: string | null
          author_id: string
          benefits: string
          complexity: string
          created_at: string
          id: string
          improvement_area: string
          rejected_by: string | null
          rejection_reason: string | null
          sector_id: string
          social_score: number
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_score: number
          approved_by?: string | null
          author_id: string
          benefits: string
          complexity: string
          created_at?: string
          id?: string
          improvement_area: string
          rejected_by?: string | null
          rejection_reason?: string | null
          sector_id: string
          social_score?: number
          status: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_score?: number
          approved_by?: string | null
          author_id?: string
          benefits?: string
          complexity?: string
          created_at?: string
          id?: string
          improvement_area?: string
          rejected_by?: string | null
          rejection_reason?: string | null
          sector_id?: string
          social_score?: number
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          cost_points: number
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_available: boolean
          name: string
        }
        Insert: {
          cost_points: number
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
        }
        Update: {
          cost_points?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
        }
        Relationships: []
      }
      marketplace_transactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          points_spent: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          points_spent: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          points_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          created_at: string
          id: string
          knowledge_area: string
          sector_id: string | null
          status: string
          user_id: string
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          knowledge_area: string
          sector_id?: string | null
          status: string
          user_id: string
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          knowledge_area?: string
          sector_id?: string | null
          status?: string
          user_id?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          confirmed_by: string | null
          created_at: string
          id: string
          mentee_evaluated_at: string | null
          mentee_feedback: string | null
          mentee_id: string
          mentee_rating: number | null
          mentor_evaluated_at: string | null
          mentor_feedback: string | null
          mentor_id: string
          mentor_rating: number | null
          next_meeting_date: string | null
          next_meeting_proposed_by: string | null
          next_meeting_responded_at: string | null
          next_meeting_responded_by: string | null
          next_meeting_status: string
          objective: string | null
          status: string
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          mentee_evaluated_at?: string | null
          mentee_feedback?: string | null
          mentee_id: string
          mentee_rating?: number | null
          mentor_evaluated_at?: string | null
          mentor_feedback?: string | null
          mentor_id: string
          mentor_rating?: number | null
          next_meeting_date?: string | null
          next_meeting_proposed_by?: string | null
          next_meeting_responded_at?: string | null
          next_meeting_responded_by?: string | null
          next_meeting_status?: string
          objective?: string | null
          status: string
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          mentee_evaluated_at?: string | null
          mentee_feedback?: string | null
          mentee_id?: string
          mentee_rating?: number | null
          mentor_evaluated_at?: string | null
          mentor_feedback?: string | null
          mentor_id?: string
          mentor_rating?: number | null
          next_meeting_date?: string | null
          next_meeting_proposed_by?: string | null
          next_meeting_responded_at?: string | null
          next_meeting_responded_by?: string | null
          next_meeting_status?: string
          objective?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_next_meeting_proposed_by_fkey"
            columns: ["next_meeting_proposed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_next_meeting_responded_by_fkey"
            columns: ["next_meeting_responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          feedback: string | null
          id: string
          rating: number
          request_id: string
          role: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          feedback?: string | null
          id?: string
          rating: number
          request_id: string
          role: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          feedback?: string | null
          id?: string
          rating?: number
          request_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_evaluations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_alerts: {
        Row: {
          content: string
          created_at: string
          id: string
          occurrence_count: number
          status: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          occurrence_count?: number
          status: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          occurrence_count?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      point_ledger: {
        Row: {
          action_type: string
          created_at: string
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_completions: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          passed: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          passed: boolean
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          passed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          correct_answer: number
          course_id: string
          created_at: string
          id: string
          options: Json
          question: string
        }
        Insert: {
          correct_answer: number
          course_id: string
          created_at?: string
          id?: string
          options: Json
          question: string
        }
        Update: {
          correct_answer?: number
          course_id?: string
          created_at?: string
          id?: string
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          can_visualize_as: boolean
          created_at: string
          email: string | null
          id: string
          is_mentor: boolean
          is_visible_in_ranking: boolean
          level: number
          matricula: string | null
          name: string
          pin: string | null
          points: number
          role: string
          sector_id: string | null
        }
        Insert: {
          can_visualize_as?: boolean
          created_at?: string
          email?: string | null
          id: string
          is_mentor?: boolean
          is_visible_in_ranking?: boolean
          level?: number
          matricula?: string | null
          name: string
          pin?: string | null
          points?: number
          role: string
          sector_id?: string | null
        }
        Update: {
          can_visualize_as?: boolean
          created_at?: string
          email?: string | null
          id?: string
          is_mentor?: boolean
          is_visible_in_ranking?: boolean
          level?: number
          matricula?: string | null
          name?: string
          pin?: string | null
          points?: number
          role?: string
          sector_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      validations: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
