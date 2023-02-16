interface Task {
  name: string;
  displayName: string;
  background: boolean;
  paused: boolean | null;
  cancellable: false;

  canPause(): boolean;
  initialize(): void;
  getPriority(): number;

  run(): Promise<void>;
  pause(): Promise<boolean>;
  cancel(): Promise<boolean>;
}