export type Database = {
  public: {
    Tables: {
      LinkedinScrapeResults: {
        Row: {
          id: number
          created_at: string
          PostedDate: string | null
          JobTitle: string | null
          URL: string | null
          Description: string | null
          EmploymentType: string | null
          WorkType: string | null
          Location: string | null
          PostedText: string | null
          Company: string | null
          LinkedInJobID: string | null
        }
        Insert: Omit<Database['public']['Tables']['LinkedinScrapeResults']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['LinkedinScrapeResults']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string
          subscription_plan: 'free' | 'pro' | 'enterprise'
          subscription_active: boolean
          subscription_renews_at: string | null
          cv_filename: string | null
          stripe_customer_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      alerts: {
        Row: {
          id: number
          user_id: string
          keywords: string
          enabled: boolean
          frequency: 'instant' | 'daily' | 'weekly'
          match_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      UserSavedJobs: {
        Row: {
          id: number
          UserID: string
          JobID: number
          created_at: string
        }
        Insert: {
          UserID: string
          JobID: number
        }
        Update: never
      }
    }
  }
}

// Convenience types
export type Contract = Database['public']['Tables']['LinkedinScrapeResults']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type SavedJob = Database['public']['Tables']['UserSavedJobs']['Row']
