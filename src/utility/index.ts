import path from "path";

const IS_EXECUTABLE = process.argv0 !== "bun";

export const CWD = IS_EXECUTABLE
  ? path.dirname(process.execPath)
  : process.cwd();
