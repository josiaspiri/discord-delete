import type { Reactions } from "../Reactions";
import type { User } from "../Users";

export enum MessageType {
  DEFAULT = 0,
  REPLY = 19,
  CHAT_INPUT_COMMAND = 20,
}

export interface Message {
  type: number;
  content: string;
  id: string;
  channel_id: string;
  author: User;
  reactions?: Reactions;
}

export interface MessageSearch {
  messages: Messages[];
  total_results: number;
}

export type Messages = Message[];
