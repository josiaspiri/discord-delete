import { sleep } from "bun";

type Task = () => Promise<void>;

export class RateLimitedQueue {
  private readonly tasks: Task[] = [];
  private draining = false;

  constructor(private readonly delayMs: number) {}

  push(task: Task): void {
    this.tasks.push(task);
    this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;

    try {
      let task: Task | undefined;
      while ((task = this.tasks.shift())) {
        try {
          await task();
        } catch (error) {
          console.error(error);
        }
        if (this.tasks.length > 0) {
          await sleep(this.delayMs);
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
