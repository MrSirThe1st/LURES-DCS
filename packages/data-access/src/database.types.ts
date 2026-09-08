/**
 * Hand-maintained DB types matching supabase/migrations/*.
 * Regenerate with `supabase gen types` when Docker/CLI access is available.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'management' | 'loading_staff';
          display_name: string;
          preferred_locale: 'en' | 'fr' | 'zh';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'management' | 'loading_staff';
          display_name: string;
          preferred_locale?: 'en' | 'fr' | 'zh';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'management' | 'loading_staff';
          display_name?: string;
          preferred_locale?: 'en' | 'fr' | 'zh';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      loading_lists: {
        Row: {
          id: string;
          loading_date: string;
          packing_list_number: string | null;
          cargo_description: string | null;
          client_name: string | null;
          destination: string | null;
          customs_agency: string | null;
          license_number: string | null;
          loading_point: string | null;
          status: 'draft' | 'active' | 'closed';
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loading_date: string;
          packing_list_number?: string | null;
          cargo_description?: string | null;
          client_name?: string | null;
          destination?: string | null;
          customs_agency?: string | null;
          license_number?: string | null;
          loading_point?: string | null;
          status?: 'draft' | 'active' | 'closed';
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loading_date?: string;
          packing_list_number?: string | null;
          cargo_description?: string | null;
          client_name?: string | null;
          destination?: string | null;
          customs_agency?: string | null;
          license_number?: string | null;
          loading_point?: string | null;
          status?: 'draft' | 'active' | 'closed';
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trucks: {
        Row: {
          id: string;
          loading_list_id: string;
          vehicle_registration: string;
          trailer_registration: string | null;
          trailer_registration_2: string | null;
          container_number: string | null;
          driver_name: string | null;
          driver_passport_reference: string | null;
          transporter_name: string | null;
          loading_location: string | null;
          transit_info: string | null;
          border: string | null;
          agent: string | null;
          packing_list_number: string | null;
          cargo_description: string | null;
          status: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
          notes: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loading_list_id: string;
          vehicle_registration: string;
          trailer_registration?: string | null;
          trailer_registration_2?: string | null;
          container_number?: string | null;
          driver_name?: string | null;
          driver_passport_reference?: string | null;
          transporter_name?: string | null;
          loading_location?: string | null;
          transit_info?: string | null;
          border?: string | null;
          agent?: string | null;
          packing_list_number?: string | null;
          cargo_description?: string | null;
          status?: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
          notes?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loading_list_id?: string;
          vehicle_registration?: string;
          trailer_registration?: string | null;
          trailer_registration_2?: string | null;
          container_number?: string | null;
          driver_name?: string | null;
          driver_passport_reference?: string | null;
          transporter_name?: string | null;
          loading_location?: string | null;
          transit_info?: string | null;
          border?: string | null;
          agent?: string | null;
          packing_list_number?: string | null;
          cargo_description?: string | null;
          status?: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
          notes?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trucks_loading_list_id_fkey';
            columns: ['loading_list_id'];
            isOneToOne: false;
            referencedRelation: 'loading_lists';
            referencedColumns: ['id'];
          },
        ];
      };
      bags: {
        Row: {
          id: string;
          truck_id: string;
          bag_number: string;
          net_weight_kg: number;
          seal_number: string | null;
          sort_order: number;
          verification_status: 'pending' | 'verified' | 'modified';
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          truck_id: string;
          bag_number: string;
          net_weight_kg: number;
          seal_number?: string | null;
          sort_order?: number;
          verification_status?: 'pending' | 'verified' | 'modified';
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          truck_id?: string;
          bag_number?: string;
          net_weight_kg?: number;
          seal_number?: string | null;
          sort_order?: number;
          verification_status?: 'pending' | 'verified' | 'modified';
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bags_truck_id_fkey';
            columns: ['truck_id'];
            isOneToOne: false;
            referencedRelation: 'trucks';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          truck_id: string | null;
          bag_id: string | null;
          action: string;
          field_name: string | null;
          previous_value: string | null;
          new_value: string | null;
          reason: string | null;
          actor_id: string | null;
          actor_display_name: string | null;
          occurred_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          truck_id?: string | null;
          bag_id?: string | null;
          action: string;
          field_name?: string | null;
          previous_value?: string | null;
          new_value?: string | null;
          reason?: string | null;
          actor_id?: string | null;
          actor_display_name?: string | null;
          occurred_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          truck_id?: string | null;
          bag_id?: string | null;
          action?: string;
          field_name?: string | null;
          previous_value?: string | null;
          new_value?: string | null;
          reason?: string | null;
          actor_id?: string | null;
          actor_display_name?: string | null;
          occurred_at?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      truck_weight_totals: {
        Row: {
          truck_id: string | null;
          bag_count: number | null;
          total_net_weight_kg: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: 'management' | 'loading_staff';
      };
      is_management: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_authenticated_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'management' | 'loading_staff';
      truck_status: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
      bag_verification_status: 'pending' | 'verified' | 'modified';
      loading_list_status: 'draft' | 'active' | 'closed';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
