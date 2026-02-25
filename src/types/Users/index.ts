export interface User {
  id: string;
  username: string;
  global_name: string;
}

export interface Me extends User {
  verified: boolean;
  nsfw_allowed: boolean;
  bio: string;
  age_verification_status: 0 | 1;
}

export type Users = User[];
