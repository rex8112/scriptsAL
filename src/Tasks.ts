import { BaseCharacter } from "./Character";

export abstract class Task {
  abstract name: string;
  abstract displayName: string;
  abstract cancellable: boolean;
  id: number = 0;
  char: BaseCharacter;
  _cancelling: boolean = false;
  _running: boolean = false;
  _priority: number = 0;
  background: boolean = false;

  constructor(char: BaseCharacter) {
    this.char = char
  }

  async run(): Promise<void> {
    this._running = true;
    await this.run_task();
    this._running = false;
  }

  abstract run_task(): Promise<void>;

  abstract getPriority(): number;

  initialize(id: number): void {
    this.id = id;
  }

  isInitialized(): boolean {
    return this.id > 0;
  }

  isRunning(): boolean {
    return this._running;
  }

  set Priority(n: number) {
    this._priority = n;
  }

  get Priority(): number {
    return this.getPriority();
  }

  async cancel(): Promise<boolean> {
    if (this.cancellable) {
      this._cancelling = true;
      return true;
    }
    return false;
  }
}

export abstract class DefaultTask extends Task {
  resetState() {
    this._cancelling = false;
  }
}

export abstract class BackgroundTask extends Task {
  cancellable: boolean = true;
  background = true;
  timer: NodeJS.Timer | null = null;
  abstract msinterval: number;

  async run() {
    this.timer = setInterval(() => { super.run() }, this.msinterval);
  }

  getPriority(): number {
    return 1;
  }

  async cancel() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return true;
  }
}

export class TaskController {
  char: BaseCharacter;
  tasks: {[id: number]: Task};
  running: boolean = false;
  backgroundTasks: {[id: number]: Task};
  defaultTask: DefaultTask | null;
  idCount = 1;
  _pause = false;

  constructor(char: BaseCharacter) {
    this.char = char;
    this.tasks = {};
    this.backgroundTasks = {};
    this.defaultTask = null;
  }

  async run(): Promise<void> {
    let v_tasks = Object.values(this.tasks);
    v_tasks.sort((a, b) => b.getPriority() - a.getPriority()); // Descending Sort

    let task_to_run = v_tasks[0];

    if (task_to_run !== undefined && this._pause == false) {
      if (this.defaultTask && this.defaultTask.isRunning()) this.defaultTask.cancel();
      set_message(task_to_run.displayName);
      this.running = true;
      console.log("Running task");
      await task_to_run.run();
      this.running = false;
      set_message("Finished");
      delete this.tasks[task_to_run.id];
    } else if (task_to_run === undefined && this._pause == false) {
      if (this.defaultTask && this.defaultTask.isRunning() == false) {
        this.defaultTask.run();
      }
    }


    setTimeout(() => { this.run() }, 100);
  }

  pause() {
    this._pause = true;
  }

  unpause() {
    this._pause = false;
  }

  taskEnqueued(taskName: string): boolean {
    for (var id in this.tasks) {
      let task = this.tasks[id];
      if (task.name == taskName) return true;
    }
    return false;
  }

  enqueueTask(task: Task, priority: number): number {
    if (this.taskEnqueued(task.name)) return 0;
    task.initialize(this.idCount);
    task.Priority = priority;
    this.idCount++;

    console.log("Enqueuing task");

    if (task.background) {
      this.backgroundTasks[task.id] = task;
      task.run(); // Background tasks handle repeating themselves.
    } else {
      this.tasks[task.id] = task;
    }
    return task.id;
  }
}