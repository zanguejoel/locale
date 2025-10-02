export interface Role {
  member_id: number;
  id: number;
  role_type: string;
}

export interface Team {
  team_name: string;
  team_type: string;
  id: number;
}

export interface UserTeam {
  team: Team;
  roles: Role[];
}
// Import the color interfaces from Colors.ts
import { ColorTheme, CommonColors } from './Colors';

export interface Theme {
  isDark?: boolean;
  colors: ColorTheme & CommonColors; // Merge both color interfaces
}

export interface User {
  first_name: string;
  middle_name: null | string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  address?: string;
  date_of_birth: string;
  city?: string;
  state?: string;
  country: null | string;
  postal_code?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  user_teams: UserTeam[];
  // Token is now stored separately in SecureStore for security
  // Use utils/SecureTokenManager.ts to access the token
}