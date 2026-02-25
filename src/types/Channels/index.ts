import type { User } from "@types";

export enum ChannelType {
  GUILD_TEXT,
  DM,
  VOICE,
  GROUP_DM,
}

export interface Channel {
  id: string;
  name?: string;
  recipients: User[];
  type: ChannelType;
  permission_overwrites: PermissionOverwrites;
}

export enum PermissionOverwriteTypes {
  ROLE,
  MEMBER,
}

export interface PermissionOverwrites {
  id: string;
  type: PermissionOverwriteTypes;
  allow: string;
  deny: string;
}

export type Channels = Channel[];
