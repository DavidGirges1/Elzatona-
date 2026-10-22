// Generated from applied migrations by npm run db:types. Do not edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      course_highlights: {
        Row: {
          id: string;
          course_id: string;
          resource_id: string;
          position: number;
          curator_id: string;
          curator_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          resource_id: string;
          position: number;
          curator_id: string;
          curator_note?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["course_highlights"]["Insert"]
        >;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          university_id: string;
          slug: string;
          code: string;
          title: string;
          title_ar: string | null;
          title_en: string | null;
          department: string;
          department_ar: string | null;
          description: string | null;
          year_level: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          slug: string;
          code: string;
          title: string;
          title_ar?: string | null;
          title_en?: string | null;
          department: string;
          department_ar?: string | null;
          description?: string | null;
          year_level?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      discussion_replies: {
        Row: {
          id: string;
          discussion_id: string;
          author_id: string;
          body: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          discussion_id: string;
          author_id: string;
          body: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["discussion_replies"]["Insert"]
        >;
        Relationships: [];
      };
      discussions: {
        Row: {
          id: string;
          course_id: string;
          topic_id: string | null;
          resource_id: string | null;
          author_id: string;
          title: string;
          body: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          topic_id?: string | null;
          resource_id?: string | null;
          author_id: string;
          title: string;
          body: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["discussions"]["Insert"]>;
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          id: string;
          actor_id: string;
          target_type: string;
          target_id: string;
          action: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          target_type: string;
          target_id: string;
          action: string;
          reason: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["moderation_actions"]["Insert"]
        >;
        Relationships: [];
      };
      mutation_limits: {
        Row: {
          user_id: string;
          action: string;
          bucket: string;
          count: number;
        };
        Insert: {
          user_id: string;
          action: string;
          bucket: string;
          count: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["mutation_limits"]["Insert"]
        >;
        Relationships: [];
      };
      product_events: {
        Row: {
          id: number;
          event: string;
          actor_id: string | null;
          course_id: string | null;
          resource_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          event: string;
          actor_id?: string | null;
          course_id?: string | null;
          resource_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_events"]["Insert"]
        >;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          resource_id: string | null;
          discussion_id: string | null;
          reply_id: string | null;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          resource_id?: string | null;
          discussion_id?: string | null;
          reply_id?: string | null;
          reason: string;
          details?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      resource_saves: {
        Row: {
          resource_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          resource_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["resource_saves"]["Insert"]
        >;
        Relationships: [];
      };
      resource_votes: {
        Row: {
          resource_id: string;
          user_id: string;
          value: number;
          created_at: string;
        };
        Insert: {
          resource_id: string;
          user_id: string;
          value: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["resource_votes"]["Insert"]
        >;
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          course_id: string;
          topic_id: string | null;
          author_id: string;
          title: string;
          description: string | null;
          type: string;
          source_kind: string;
          external_url: string | null;
          normalized_url: string | null;
          storage_path: string | null;
          semester_label: string | null;
          is_ai_assisted: boolean;
          rights_confirmed: boolean;
          status: string;
          upvotes_count: number;
          downvotes_count: number;
          score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          topic_id?: string | null;
          author_id: string;
          title: string;
          description?: string | null;
          type: string;
          source_kind: string;
          external_url?: string | null;
          normalized_url?: string | null;
          storage_path?: string | null;
          semester_label?: string | null;
          is_ai_assisted?: boolean;
          rights_confirmed?: boolean;
          status: string;
          upvotes_count?: number;
          downvotes_count?: number;
          score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          title_ar: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          title_ar?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>;
        Relationships: [];
      };
      universities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_ar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_ar?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["universities"]["Insert"]>;
        Relationships: [];
      };
      user_courses: {
        Row: {
          user_id: string;
          course_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          course_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_courses"]["Insert"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      resource_cards: {
        Row: {
          id: string;
          course_id: string;
          topic_id: string | null;
          author_id: string;
          title: string;
          description: string | null;
          type: string;
          source_kind: string;
          external_url: string | null;
          is_ai_assisted: boolean;
          created_at: string;
          status: string;
          score: number;
          author_name: string;
          topic_title: string | null;
          course_slug: string;
          course_title: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      toggle_save: { Args: { p_resource: string | null }; Returns: undefined };
      ask_question: {
        Args: {
          p_course: string;
          p_resource: string | null;
          p_title: string;
          p_body: string;
        };
        Returns: string;
      };
      reply_question: {
        Args: { p_discussion: string; p_body: string };
        Returns: undefined;
      };
      edit_resource: {
        Args: {
          p_resource: string | null;
          p_title: string;
          p_description: string;
          p_topic: string | null;
        };
        Returns: undefined;
      };
      is_moderator: { Args: Record<string, never>; Returns: boolean };
      follow_course: { Args: { p_course: string }; Returns: undefined };
      submit_resource: {
        Args: {
          p_course: string;
          p_topic: string | null;
          p_title: string;
          p_description: string;
          p_type: string;
          p_url: string;
          p_rights: boolean;
          p_ai?: boolean;
        };
        Returns: string;
      };
      set_vote: {
        Args: { p_resource: string | null; p_value: number };
        Returns: undefined;
      };
      report_content: {
        Args: {
          p_kind: string;
          p_target: string;
          p_reason: string;
          p_details: string;
        };
        Returns: undefined;
      };
      moderate_report: {
        Args: { p_report: string; p_action: string; p_reason: string };
        Returns: undefined;
      };
      set_highlight: {
        Args: {
          p_course: string;
          p_resource: string | null;
          p_position: number;
          p_note: string;
        };
        Returns: undefined;
      };
      update_profile: { Args: { p_name: string }; Returns: undefined };
      record_open: { Args: { p_resource: string | null }; Returns: undefined };
      prepare_pdf: {
        Args: {
          p_course: string;
          p_topic: string | null;
          p_title: string;
          p_description: string;
          p_type: string;
          p_rights: boolean;
          p_ai?: boolean;
        };
        Returns: string;
      };
      finalize_pdf: { Args: { p_resource: string | null }; Returns: undefined };
      finalize_pdf_checked: {
        Args: { p_resource: string | null; p_author: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
