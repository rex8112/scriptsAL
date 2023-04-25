import { MerchantCharacter } from "../Character.js";
import { MerchantController } from "../Controllers.js";
import { DefaultTask } from "../MerchantTasks.js";
import { sleep } from "../Utils/Functions.js";

export class OpenStand extends DefaultTask {
  name = "open_stand";

  displayName = "Open Stand";

  cancellable = true;
  mc: MerchantController;

  constructor(char: MerchantController) {
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
    await this.mc.merchant.move("market");
    await this.mc.merchant.ch.openMerchantStand();
    while (this._cancelling == false) {
      await sleep(500);
    }
    await this.mc.merchant.ch.closeMerchantStand();
    this._cancelling = false;
  }
}