import { MerchantCharacter } from "../Character.js";
import { DefaultTask } from "../MerchantTasks.js";

export class OpenStand extends DefaultTask {
  name = "open_stand";

  displayName = "Open Stand";

  cancellable = true;
  mc: MerchantCharacter;

  constructor(char: MerchantCharacter) {
    super(char);
    this.mc = char;
  }

  initialize(id: number) {
    this.id = id;
  }

  getPriority(): number {
    return this._priority;
  }

  async run_task(): Promise<void> {
    await this.mc.move("market");
    await open_stand();
    while (this._cancelling == false) {
      await sleep(500);
    }
    await close_stand();
    this._cancelling = false;
  }
}