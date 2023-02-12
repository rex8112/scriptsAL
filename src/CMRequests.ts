import { CodeMessageEvent } from "typed-adventureland";

interface ResponseOK {
  status: 200;
  message: unknown;
}

interface ResponseTimeOut {
  status: 408;
  message: string;
}

interface ResponseBadRequest {
  status: 400;
  message: string;
}

export type ResponseMessage = ResponseOK | ResponseTimeOut | ResponseBadRequest;

interface RequestPayload<T> {
  to: string;
  from: string;
  message_id: string;
  response: boolean;
  message: T;
}

function isRequestPayload(payload: any): payload is RequestPayload<unknown> {
  if (payload.message_id != undefined) {
    var keys = Object.keys(payload);
    if (keys.includes("to") && keys.includes("from") && keys.includes("response") && keys.includes("message")) return true;
  }
  return false;
}

export class CMRequests {
  messageIncrement: number = 0;
  receiveCallback: (message: Request<any>) => void;
  waitingRequests: {[message_id: string]: (data: CodeMessageEvent<RequestPayload<ResponseMessage>>) => void} = {};

  /**
   * Builds a request system akin to API requests, allows you to make an awaitable request.
   * This class does not handle formats, such as whether you're doing a GET or POST request.
   * All it handles is specifying a response code but the user is in charge of the format of the requests sent.
   * @param callback The callback that handles new requests.
   */
  constructor(callback: (message: Request<any>) => void) {
    this.receiveCallback = callback;
    character.on("cm", (data) => this.receiveMessage(<CodeMessageEvent<RequestPayload<any>>>data));
  }

  /**
   * Receives the raw payload and converts it to Request class then sends it to callback.
   * @param message The message received.
   * @returns 
   */
  async receiveMessage(message: CodeMessageEvent<RequestPayload<unknown>>) {
    const trusted: string[] = []
    get_characters().forEach((c) => {trusted.push(c.name)})

    if (!trusted.includes(message.name) || message.name === character.name) {
      game_log("CM Received from Bad Party: " + message.name + ": " + message.message, "red");
      return;
    }
    if (isRequestPayload(message.message) && message.message.response === false) {
      // await sleep(150);
      console.log(`Received: `, message);
      this.receiveCallback(new Request(this, message.message));
    } else if (isRequestPayload(message.message)) {
      // This calls the callback stored to say the response has arrived.
      console.log(`Responded: `, message);
      this.waitingRequests[message.message.message_id](<CodeMessageEvent<RequestPayload<ResponseMessage>>>message);
    }
  }
  
  _sendMessage(target: string, payload: RequestPayload<unknown>) {
    console.log(`Sending: `, payload);
    send_cm(target, payload);
  }

  /**
   * Send a request to a character and await the response.
   * @param target The character name to send the request to.
   * @param message The message content.
   * @param timeout Default: 30000. Time in ms to wait before timing out.
   * @returns The response message.
   */
  async request<T>(target: string, message: T, timeout: number = 30_000): Promise<ResponseMessage> {
    const payload: RequestPayload<T> = {
      to: target,
      from: character.name,
      response: false,
      message: message,
      message_id: `${character.name}_${this.messageIncrement}`
    }
    this.messageIncrement++;
    var responsePromise = this._getResponsePromise(payload, timeout);
    this._sendMessage(payload.to, payload);
    var response = await responsePromise;
    return response.message;
  }

  /**
   * Builds a promise to return a specific response that matches the message id.
   * @param message_id The message id that will be returned by the response. This is the same as what was sent.
   * @param timeout The time in ms that it will wait.
   * @returns A Promise of the returning payload
   */
  _getResponsePromise(payload: RequestPayload<unknown>, timeout: number = 30_000): Promise<RequestPayload<ResponseMessage>> {
    return new Promise(resolve => {
      var tout: NodeJS.Timeout | null = null;
      if (timeout > 0) {
        tout = setTimeout(() => { 
          resolve({
            to: payload.to,
            from: payload.from,
            message_id: payload.message_id,
            response: true,
            message: {status: 408, message: "Timed out"}
          });
          delete this.waitingRequests[payload.message_id];
        }, timeout);
      }
      
      var onceCMListener = (data: CodeMessageEvent<RequestPayload<ResponseMessage>>) => {

        if (data.message.message_id === payload.message_id) {
          if (tout != null) clearTimeout(tout);
          resolve(data.message);
          delete this.waitingRequests[payload.message_id];
        }
      }
      this.waitingRequests[payload.message_id] = onceCMListener;
    });
  }
}

export class Request<T> {
  parent: CMRequests;
  payload: RequestPayload<T>;

  constructor(parent: CMRequests, payload: RequestPayload<T>) {
    this.parent = parent;
    this.payload = payload;
  }

  get to() {
    return this.payload.to;
  }

  get from() {
    return this.payload.from;
  }

  get message() {
    return this.payload.message;
  }

  respond(message: ResponseMessage) {
    this.parent._sendMessage(this.from, {
      to: this.payload.to,
      from: this.payload.from,
      message_id: this.payload.message_id,
      response: true,
      message: message
    });
  }

  respondOK(message: any) {
    this.respond({status: 200, message: message});
  }
}