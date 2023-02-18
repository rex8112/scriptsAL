import { BaseCharacter } from "./Character";

export interface Task {
  name: string;
  displayName: string;
  id: number;
  priority: number;
  background: boolean;
  paused: boolean | null;
  cancellable: boolean;

  canPause(): boolean;
  initialize(id: number): void;
  getPriority(): number;

  run(): Promise<void>;
  pause(): Promise<boolean>;
  cancel(): Promise<boolean>;
}

export interface BackgroundTask extends Task {
  background: true;
  interval: NodeJS.Timer | null;
}

export class TaskController {
  char: BaseCharacter;
  tasks: {[id: number]: Task};
  backgroundTasks: {[id: number]: Task};
  idCount = 0;

  constructor(char: BaseCharacter) {
    this.char = char;
    this.tasks = {};
    this.backgroundTasks = {};
  }

  async run(): Promise<void> {
    let v_tasks = Object.values(this.tasks);
    v_tasks.sort((a, b) => b.getPriority() - a.getPriority()); // Descending Sort

    let task_to_run = v_tasks[0];

    set_message(task_to_run.displayName);
    await task_to_run.run();

    delete this.tasks[task_to_run.id];

    setTimeout(() => { this.run() }, 100);
  }

  enqueueTask(task: Task, priority: number): number {
    task.initialize(this.idCount);
    task.priority = priority;
    this.idCount++;

    if (task.background) {
      this.backgroundTasks[task.id] = task;
      task.run(); // Background tasks handle repeating themselves.
    } else {
      this.tasks[task.id] = task;
    }
    return task.id;
  }
}