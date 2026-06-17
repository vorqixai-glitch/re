export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  problem: string;
  solution: string;
  features: string[];
  pricing: {
    free: string;
    pro: string;
    enterprise: string;
  };
  mvp_steps: string[];
  created_at: string;
  is_public: boolean;
  unlocked_by?: string[];
}
