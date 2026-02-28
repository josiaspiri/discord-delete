import path from "path";

const getCWD = (isExecutable: boolean) => {
  if (isExecutable) {
    return path.dirname(process.execPath);
  }
  return process.cwd();
};

export const IS_EXECUTABLE = process.argv0 !== "bun";
export const CWD = getCWD(IS_EXECUTABLE);
