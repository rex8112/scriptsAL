import { MerchantCharacter } from "../Character.js";
import { DefaultTask } from "../MerchantTasks.js";

export class OpenStand extends DefaultTask {
  name = "open_stand";

  displayName = "Open Stand";

  cancellable = true;
  char: MerchantCharacter;

  constructor(char: MerchantCharacter) {
    super(char);
    this.char = char;
  }

  initialize(id: number) {
    this.id = id;
  }

  getPriority(): number {
    return this._priority;
  }

  async run_task(): Promise<void> {
    await this.char.move("market");
    await open_stand();
    while (this._cancelling == false) {
      await sleep(500);
    }
    await close_stand();
    this._cancelling = false;
  }
}