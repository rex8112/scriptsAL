import { MerchantCharacter } from "./Character.js";

export abstract class Task {
  abstract name: string;
  abstract displayName: string;
  abstract cancellable: boolean;
  id: number = 0;
  char: MerchantCharacter;
  _cancelling: boolean = false;
  _running: boolean = false;
  _priority: number = 0;
  background: boolean = false;

  constructor(char: MerchantCharacter) {
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

export class MerchantTaskController {
  char: MerchantCharacter;
  tasks: {[id: number]: Task};
  running: boolean = false;
  backgroundTasks: {[id: number]: Task};
  defaultTask: DefaultTask | null;
  idCount = 1;
  _pause = false;

  constructor(char: MerchantCharacter) {
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
      
      this.running = true;
      console.log("Running task", task_to_run.displayName);
      try {
        await this.char.ch.closeMerchantStand();
        await task_to_run.run();
        await this.char.ch.openMerchantStand();
      } catch (error) {
        console.error(`Error in ${task_to_run.name}`, error);
      }
      console.log(`Finished Task: ${task_to_run.displayName}`);
      this.running = false;
      
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
    for (let id in this.tasks) {
      let task = this.tasks[id];
      if (task.name == taskName) return true;
    }
    for (let id in this.backgroundTasks) {
      let task = this.backgroundTasks[id];
      if (task.name == taskName) return true;
    }
    return false;
  }

  enqueueTask(task: Task, priority: number = 0): number {
    if (this.taskEnqueued(task.name)) return 0;
    task.initialize(this.idCount);
    task.Priority = priority;
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