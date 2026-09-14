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
          role: 'management' | 'loading_staff' | 'yard_agent';
          display_name: string;
          preferred_locale: 'en' | 'fr' | 'zh';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'management' | 'loading_staff' | 'yard_agent';
          display_name: string;
          preferred_locale?: 'en' | 'fr' | 'zh';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'management' | 'loading_staff' | 'yard_agent';
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
          bulletin_number: string | null;
          program_code: string | null;
          cargo_description: string | null;
          client_name: string | null;
          destination: string | null;
          customs_agency: string | null;
          license_number: string | null;
          loading_point: string | null;
          original_filename: string | null;
          storage_path: string | null;
          status: 'draft' | 'active' | 'closed';
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loading_date: string;
          bulletin_number?: string | null;
          program_code?: string | null;
          cargo_description?: string | null;
          client_name?: string | null;
          destination?: string | null;
          customs_agency?: string | null;
          license_number?: string | null;
          loading_point?: string | null;
          original_filename?: string | null;
          storage_path?: string | null;
          status?: 'draft' | 'active' | 'closed';
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loading_date?: string;
          bulletin_number?: string | null;
          program_code?: string | null;
          cargo_description?: string | null;
          client_name?: string | null;
          destination?: string | null;
          customs_agency?: string | null;
          license_number?: string | null;
          loading_point?: string | null;
          original_filename?: string | null;
          storage_path?: string | null;
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
          loading_list_id: string | null;
          vehicle_registration: string;
          trailer_registration: string | null;
          trailer_registration_2: string | null;
          container_number: string | null;
          driver_name: string | null;
          driver_phone: string | null;
          driver_passport_reference: string | null;
          transporter_name: string | null;
          client_name: string | null;
          loading_location: string | null;
          transit_info: string | null;
          border: string | null;
          agent: string | null;
          packing_list_number: string | null;
          cargo_description: string | null;
          status: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
          notes: string | null;
          arrived_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          arrival_status: 'expected' | 'arrived' | 'cancelled' | 'did_not_arrive';
          unplanned: boolean;
          arrived_by: string | null;
          pre_alert_id: string | null;
          horse_vehicle_id: string | null;
          trailer_vehicle_id: string | null;
          trailer2_vehicle_id: string | null;
          eta_to_mine: string | null;
          on_site: boolean;
          planned_tonnage: number | null;
          final_destination: string | null;
          program_sequence: number | null;
          loading_started_at: string | null;
          package_count: number | null;
          gross_weight_t: number | null;
          net_weight_t: number | null;
          field_sources: Json;
          information_verified_by_person_id: string | null;
          source_highlight: string | null;
        };
        Insert: {
          id?: string;
          loading_list_id?: string | null;
          vehicle_registration: string;
          trailer_registration?: string | null;
          trailer_registration_2?: string | null;
          container_number?: string | null;
          driver_name?: string | null;
          driver_phone?: string | null;
          driver_passport_reference?: string | null;
          transporter_name?: string | null;
          client_name?: string | null;
          loading_location?: string | null;
          transit_info?: string | null;
          border?: string | null;
          agent?: string | null;
          packing_list_number?: string | null;
          cargo_description?: string | null;
          status?: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
          notes?: string | null;
          arrived_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          arrival_status?: 'expected' | 'arrived' | 'cancelled' | 'did_not_arrive';
          unplanned?: boolean;
          arrived_by?: string | null;
          pre_alert_id?: string | null;
          horse_vehicle_id?: string | null;
          trailer_vehicle_id?: string | null;
          trailer2_vehicle_id?: string | null;
          eta_to_mine?: string | null;
          on_site?: boolean;
          planned_tonnage?: number | null;
          final_destination?: string | null;
          program_sequence?: number | null;
          loading_started_at?: string | null;
          package_count?: number | null;
          gross_weight_t?: number | null;
          net_weight_t?: number | null;
          field_sources?: Json;
          information_verified_by_person_id?: string | null;
          source_highlight?: string | null;
        };
        Update: {
          id?: string;
          loading_list_id?: string | null;
          vehicle_registration?: string;
          trailer_registration?: string | null;
          trailer_registration_2?: string | null;
          container_number?: string | null;
          driver_name?: string | null;
          driver_phone?: string | null;
          driver_passport_reference?: string | null;
          transporter_name?: string | null;
          client_name?: string | null;
          loading_location?: string | null;
          transit_info?: string | null;
          border?: string | null;
          agent?: string | null;
          packing_list_number?: string | null;
          cargo_description?: string | null;
          status?: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
          notes?: string | null;
          arrived_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          arrival_status?: 'expected' | 'arrived' | 'cancelled' | 'did_not_arrive';
          unplanned?: boolean;
          arrived_by?: string | null;
          pre_alert_id?: string | null;
          horse_vehicle_id?: string | null;
          trailer_vehicle_id?: string | null;
          trailer2_vehicle_id?: string | null;
          eta_to_mine?: string | null;
          on_site?: boolean;
          planned_tonnage?: number | null;
          final_destination?: string | null;
          program_sequence?: number | null;
          loading_started_at?: string | null;
          package_count?: number | null;
          gross_weight_t?: number | null;
          net_weight_t?: number | null;
          field_sources?: Json;
          information_verified_by_person_id?: string | null;
          source_highlight?: string | null;
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
      pre_alerts: {
        Row: {
          id: string;
          status: 'draft' | 'active' | 'paused' | 'closed' | 'cancelled';
          client_name: string | null;
          loading_point: string | null;
          offloading_point: string | null;
          period_month: string | null;
          allocation_mt: number | null;
          booked_mt: number | null;
          balance_mt: number | null;
          allocation_truck_count: number | null;
          booked_truck_count: number | null;
          balance_truck_count: number | null;
          original_filename: string | null;
          storage_path: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: 'draft' | 'active' | 'paused' | 'closed' | 'cancelled';
          client_name?: string | null;
          loading_point?: string | null;
          offloading_point?: string | null;
          period_month?: string | null;
          allocation_mt?: number | null;
          booked_mt?: number | null;
          balance_mt?: number | null;
          allocation_truck_count?: number | null;
          booked_truck_count?: number | null;
          balance_truck_count?: number | null;
          original_filename?: string | null;
          storage_path?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: 'draft' | 'active' | 'paused' | 'closed' | 'cancelled';
          client_name?: string | null;
          loading_point?: string | null;
          offloading_point?: string | null;
          period_month?: string | null;
          allocation_mt?: number | null;
          booked_mt?: number | null;
          balance_mt?: number | null;
          allocation_truck_count?: number | null;
          booked_truck_count?: number | null;
          balance_truck_count?: number | null;
          original_filename?: string | null;
          storage_path?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pre_alert_lines: {
        Row: {
          id: string;
          pre_alert_id: string;
          truck_id: string;
          sequence: number | null;
          transporter_name: string | null;
          vehicle_registration: string;
          trailer_registration: string | null;
          trailer_registration_2: string | null;
          driver_name: string | null;
          driver_passport_reference: string | null;
          planned_tonnage: number | null;
          border: string | null;
          final_destination: string | null;
          eta_to_mine: string | null;
          on_site: boolean;
          eta_raw: string | null;
          eta_review: 'kept' | 'edited' | 'cleared' | null;
          source_highlight: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pre_alert_id: string;
          truck_id: string;
          sequence?: number | null;
          transporter_name?: string | null;
          vehicle_registration: string;
          trailer_registration?: string | null;
          trailer_registration_2?: string | null;
          driver_name?: string | null;
          driver_passport_reference?: string | null;
          planned_tonnage?: number | null;
          border?: string | null;
          final_destination?: string | null;
          eta_to_mine?: string | null;
          on_site?: boolean;
          eta_raw?: string | null;
          eta_review?: 'kept' | 'edited' | 'cleared' | null;
          source_highlight?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pre_alert_id?: string;
          truck_id?: string;
          sequence?: number | null;
          transporter_name?: string | null;
          vehicle_registration?: string;
          trailer_registration?: string | null;
          trailer_registration_2?: string | null;
          driver_name?: string | null;
          driver_passport_reference?: string | null;
          planned_tonnage?: number | null;
          border?: string | null;
          final_destination?: string | null;
          eta_to_mine?: string | null;
          on_site?: boolean;
          eta_raw?: string | null;
          eta_review?: 'kept' | 'edited' | 'cleared' | null;
          source_highlight?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          registration: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_name_aliases: {
        Row: {
          id: string;
          kind: string;
          name_a: string;
          name_b: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          name_a: string;
          name_b: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          name_a?: string;
          name_b?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      external_persons: {
        Row: {
          id: string;
          client_name: string;
          display_name: string;
          role_label: string | null;
          profile_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_name: string;
          display_name: string;
          role_label?: string | null;
          profile_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_name?: string;
          display_name?: string;
          role_label?: string | null;
          profile_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Returns: 'management' | 'loading_staff' | 'yard_agent';
      };
      is_management: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_yard_agent: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_loading_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_authenticated_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'management' | 'loading_staff' | 'yard_agent';
      truck_status: 'waiting' | 'available' | 'loading' | 'completed' | 'on_hold' | 'cancelled';
      bag_verification_status: 'pending' | 'verified' | 'modified';
      loading_list_status: 'draft' | 'active' | 'closed';
      arrival_status: 'expected' | 'arrived' | 'cancelled' | 'did_not_arrive';
      pre_alert_status: 'draft' | 'active' | 'paused' | 'closed' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
