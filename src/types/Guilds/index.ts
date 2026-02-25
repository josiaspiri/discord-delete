import type { User } from "types/Users";

export interface Guild {
  id: string;
  name: string;
}

export interface GuildRole {
  id: string;
  name: string;
  permissions: string;
  position: number;
}

export interface GuildMember {
  user: User;
  roles: string[];
}

export type Guilds = Guild[];
