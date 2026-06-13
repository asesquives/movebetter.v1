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
      appointments: {
        Row: {
          client_id: string | null
          confirmed_via_bot: boolean | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          metadata: Json | null
          notes: string | null
          package_id: string | null
          price: number | null
          professional_id: string | null
          revenue_amount: number | null
          scheduled_at: string | null
          service_id: string | null
          staff_id: string | null
          start_time: string | null
          status: string
          tenant_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          confirmed_via_bot?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          package_id?: string | null
          price?: number | null
          professional_id?: string | null
          revenue_amount?: number | null
          scheduled_at?: string | null
          service_id?: string | null
          staff_id?: string | null
          start_time?: string | null
          status?: string
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          confirmed_via_bot?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          package_id?: string | null
          price?: number | null
          professional_id?: string | null
          revenue_amount?: number | null
          scheduled_at?: string | null
          service_id?: string | null
          staff_id?: string | null
          start_time?: string | null
          status?: string
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "package_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_blocks: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          is_available: boolean
          professional_id: string | null
          staff_id: string | null
          start_time: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_available?: boolean
          professional_id?: string | null
          staff_id?: string | null
          start_time: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean
          professional_id?: string | null
          staff_id?: string | null
          start_time?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          churn_risk: string | null
          created_at: string | null
          email: string | null
          first_visit_at: string | null
          full_name: string | null
          id: string
          last_visit_at: string | null
          lifetime_value: number | null
          metadata: Json | null
          name: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          tenant_id: string | null
          total_visits: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          churn_risk?: string | null
          created_at?: string | null
          email?: string | null
          first_visit_at?: string | null
          full_name?: string | null
          id?: string
          last_visit_at?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          total_visits?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          churn_risk?: string | null
          created_at?: string | null
          email?: string | null
          first_visit_at?: string | null
          full_name?: string | null
          id?: string
          last_visit_at?: string | null
          lifetime_value?: number | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          total_visits?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_log: {
        Row: {
          action: string
          campos_modificados: Json | null
          client_id: string | null
          id: string
          ip_address: string | null
          record_id: string | null
          staff_id: string | null
          table_name: string
          tenant_id: string
          timestamp: string | null
          user_agent: string | null
          valores_anteriores: Json | null
        }
        Insert: {
          action: string
          campos_modificados?: Json | null
          client_id?: string | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          staff_id?: string | null
          table_name: string
          tenant_id: string
          timestamp?: string | null
          user_agent?: string | null
          valores_anteriores?: Json | null
        }
        Update: {
          action?: string
          campos_modificados?: Json | null
          client_id?: string | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          staff_id?: string | null
          table_name?: string
          tenant_id?: string
          timestamp?: string | null
          user_agent?: string | null
          valores_anteriores?: Json | null
        }
        Relationships: []
      }
      clinical_records: {
        Row: {
          antecedentes_medicos: string | null
          client_id: string
          consentimiento_firmado: boolean | null
          consentimiento_recibido_por: string | null
          created_at: string | null
          created_by: string | null
          diagnostico_inicial: string
          dni_paciente: string
          fecha_consentimiento: string | null
          id: string
          motivo_consulta: string
          plan_tratamiento: string
          tenant_id: string
          version_consentimiento: string | null
        }
        Insert: {
          antecedentes_medicos?: string | null
          client_id: string
          consentimiento_firmado?: boolean | null
          consentimiento_recibido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnostico_inicial: string
          dni_paciente: string
          fecha_consentimiento?: string | null
          id?: string
          motivo_consulta: string
          plan_tratamiento: string
          tenant_id: string
          version_consentimiento?: string | null
        }
        Update: {
          antecedentes_medicos?: string | null
          client_id?: string
          consentimiento_firmado?: boolean | null
          consentimiento_recibido_por?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnostico_inicial?: string
          dni_paciente?: string
          fecha_consentimiento?: string | null
          id?: string
          motivo_consulta?: string
          plan_tratamiento?: string
          tenant_id?: string
          version_consentimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_consentimiento_recibido_por_fkey"
            columns: ["consentimiento_recibido_por"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_consentimiento_recibido_por_fkey"
            columns: ["consentimiento_recibido_por"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          active_clients: number | null
          appointments_completed: number | null
          appointments_no_show: number | null
          appointments_total: number | null
          churn_risk_count: number | null
          created_at: string | null
          date: string
          id: string
          new_clients: number | null
          occupancy_rate: number | null
          revenue: number | null
          tenant_id: string
        }
        Insert: {
          active_clients?: number | null
          appointments_completed?: number | null
          appointments_no_show?: number | null
          appointments_total?: number | null
          churn_risk_count?: number | null
          created_at?: string | null
          date: string
          id?: string
          new_clients?: number | null
          occupancy_rate?: number | null
          revenue?: number | null
          tenant_id: string
        }
        Update: {
          active_clients?: number | null
          appointments_completed?: number | null
          appointments_no_show?: number | null
          appointments_total?: number | null
          churn_risk_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_clients?: number | null
          occupancy_rate?: number | null
          revenue?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          client_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_monthly_pass: boolean
          name: string
          notes: string | null
          payment_method: string | null
          price_paid: number | null
          price_per_session: number | null
          receipt_type: string | null
          service_id: string | null
          sessions_used: number | null
          status: string | null
          tenant_id: string | null
          total_paid: number | null
          total_sessions: number
          type: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_monthly_pass?: boolean
          name: string
          notes?: string | null
          payment_method?: string | null
          price_paid?: number | null
          price_per_session?: number | null
          receipt_type?: string | null
          service_id?: string | null
          sessions_used?: number | null
          status?: string | null
          tenant_id?: string | null
          total_paid?: number | null
          total_sessions: number
          type?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_monthly_pass?: boolean
          name?: string
          notes?: string | null
          payment_method?: string | null
          price_paid?: number | null
          price_per_session?: number | null
          receipt_type?: string | null
          service_id?: string | null
          sessions_used?: number | null
          status?: string | null
          tenant_id?: string | null
          total_paid?: number | null
          total_sessions?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "package_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          method: string | null
          notes: string | null
          package_id: string | null
          paid_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          is_monthly_pass: boolean
          name: string
          price: number
          price_per_session: number | null
          program: string | null
          sessions: number | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_monthly_pass?: boolean
          name: string
          price: number
          price_per_session?: number | null
          program?: string | null
          sessions?: number | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_monthly_pass?: boolean
          name?: string
          price?: number
          price_per_session?: number | null
          program?: string | null
          sessions?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          appointment_id: string
          client_id: string
          created_at: string | null
          eva_final: number | null
          eva_inicial: number | null
          evolucion: string | null
          fecha_firma: string | null
          firma_hash: string | null
          firmado: boolean | null
          firmado_por: string | null
          id: string
          numero_colegiatura: string | null
          observaciones: string
          plan_siguiente: string | null
          staff_id: string
          tecnicas_aplicadas: string[] | null
          tenant_id: string
        }
        Insert: {
          appointment_id: string
          client_id: string
          created_at?: string | null
          eva_final?: number | null
          eva_inicial?: number | null
          evolucion?: string | null
          fecha_firma?: string | null
          firma_hash?: string | null
          firmado?: boolean | null
          firmado_por?: string | null
          id?: string
          numero_colegiatura?: string | null
          observaciones: string
          plan_siguiente?: string | null
          staff_id: string
          tecnicas_aplicadas?: string[] | null
          tenant_id: string
        }
        Update: {
          appointment_id?: string
          client_id?: string
          created_at?: string | null
          eva_final?: number | null
          eva_inicial?: number | null
          evolucion?: string | null
          fecha_firma?: string | null
          firma_hash?: string | null
          firmado?: boolean | null
          firmado_por?: string | null
          id?: string
          numero_colegiatura?: string | null
          observaciones?: string
          plan_siguiente?: string | null
          staff_id?: string
          tecnicas_aplicadas?: string[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          role: string | null
          schedule_days: string[] | null
          schedule_end: string | null
          schedule_start: string | null
          tenant_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          role?: string | null
          schedule_days?: string[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          role?: string | null
          schedule_days?: string[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          plan: string
          slug: string
          status: string
          timezone: string | null
          vertical: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          plan?: string
          slug: string
          status?: string
          timezone?: string | null
          vertical: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          plan?: string
          slug?: string
          status?: string
          timezone?: string | null
          vertical?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          appointment_id: string | null
          body: string
          client_id: string | null
          direction: string
          id: string
          intent: string | null
          responded_by: string | null
          sent_at: string | null
          tenant_id: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          client_id?: string | null
          direction: string
          id?: string
          intent?: string | null
          responded_by?: string | null
          sent_at?: string | null
          tenant_id: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          client_id?: string | null
          direction?: string
          id?: string
          intent?: string | null
          responded_by?: string | null
          sent_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      package_catalog: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string | null
          is_monthly_pass: boolean | null
          name: string | null
          price: number | null
          price_per_session: number | null
          program: string | null
          sessions: number | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_monthly_pass?: boolean | null
          name?: string | null
          price?: number | null
          price_per_session?: number | null
          program?: string | null
          sessions?: number | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_monthly_pass?: boolean | null
          name?: string | null
          price?: number | null
          price_per_session?: number | null
          program?: string | null
          sessions?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string | null
          role: string | null
          schedule_days: string[] | null
          schedule_end: string | null
          schedule_start: string | null
          tenant_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          role?: string | null
          schedule_days?: string[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          role?: string | null
          schedule_days?: string[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          amount: number | null
          appointment_id: string | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          notes: string | null
          package_id: string | null
          paid_at: string | null
          payment_method: string | null
          recognized_at: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount?: number | null
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          recognized_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number | null
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          recognized_at?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "done"
        | "cancelled"
        | "no_show"
        | "pending"
      appointment_type:
        | "medical_diagnosis"
        | "physio_diagnosis"
        | "rehabilitation"
        | "prehabilitation"
        | "recovery"
      catalog_program:
        | "diagnosis"
        | "prehabilitation"
        | "rehabilitation"
        | "recovery"
      package_type: "rehabilitation" | "prehabilitation" | "recovery"
      payment_method: "yape" | "transfer" | "card" | "cash"
      professional_type: "physio" | "evaluator"
      receipt_type: "boleta" | "factura"
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
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "done",
        "cancelled",
        "no_show",
        "pending",
      ],
      appointment_type: [
        "medical_diagnosis",
        "physio_diagnosis",
        "rehabilitation",
        "prehabilitation",
        "recovery",
      ],
      catalog_program: [
        "diagnosis",
        "prehabilitation",
        "rehabilitation",
        "recovery",
      ],
      package_type: ["rehabilitation", "prehabilitation", "recovery"],
      payment_method: ["yape", "transfer", "card", "cash"],
      professional_type: ["physio", "evaluator"],
      receipt_type: ["boleta", "factura"],
    },
  },
} as const
