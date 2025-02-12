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

export interface User {
  first_name: string;
  middle_name: null | string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  address: null | string;
  date_of_birth: string;
  city: null | string;
  state: null | string;
  country: null | string;
  postal_code: null | string;
  user_id: number;
  created_at: string;
  updated_at: string;
  user_teams: UserTeam[];
  token: string;
}