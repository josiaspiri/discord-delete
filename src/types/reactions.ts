export type UTF16EncodedCharacter = string;

export type Emoji = {
  id: string | null;
  name: UTF16EncodedCharacter;
};

export interface Reaction {
  emoji: Emoji;
  me: boolean;
}

export type Reactions = Reaction[];
