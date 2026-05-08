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
          IR35Status: string | null
          PayRate: string | null
          PosterEmail: string | null
          PosterName: string | null
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
          subscription_plan: 'free' | 'pro' | 'enterprise' | 'recruiter'
          subscription_active: boolean
          subscription_renews_at: string | null
          cv_filename: string | null
          stripe_customer_id: string | null
          account_type: 'contractor' | 'recruiter' | null
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
      SuggestedSearchTerms: {
        Row: {
          id: number
          SearchTerm: string
          UID: string | null
          AccountName: string | null
          created_at: string
        }
        Insert: {
          SearchTerm: string
          UID?: string | null
          AccountName?: string | null
        }
        Update: never
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
      recruiter_saved_candidates: {
        Row: {
          id: number
          recruiter_id: string
          candidate_id: string
          created_at: string
        }
        Insert: {
          recruiter_id: string
          candidate_id: string
        }
        Update: never
      }
      recruiter_cv_views: {
        Row: {
          id: number
          recruiter_id: string
          candidate_id: string
          viewed_at: string
        }
        Insert: {
          recruiter_id: string
          candidate_id: string
        }
        Update: never
      }
      recruiter_contracts: {
        Row: {
          id: number
          recruiter_id: string
          title: string
          company: string | null
          location: string | null
          description: string | null
          pay_rate: string | null
          employment_type: string | null
          work_type: string | null
          ir35_status: string | null
          status: 'active' | 'closed'
          created_at: string
        }
        Insert: {
          recruiter_id: string
          title: string
          company?: string | null
          location?: string | null
          description?: string | null
          pay_rate?: string | null
          employment_type?: string | null
          work_type?: string | null
          ir35_status?: string | null
          status?: 'active' | 'closed'
        }
        Update: Partial<Omit<Database['public']['Tables']['recruiter_contracts']['Insert'], 'recruiter_id'>>
      }
    }
  }
}

// Convenience types
export type Contract = Database['public']['Tables']['LinkedinScrapeResults']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type SavedJob = Database['public']['Tables']['UserSavedJobs']['Row']
export type RecruiterSavedCandidate = Database['public']['Tables']['recruiter_saved_candidates']['Row']
export type RecruiterContract = Database['public']['Tables']['recruiter_contracts']['Row']
