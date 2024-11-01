type EventCallback = (...args: any[]) => void;

export interface WebcontainerErrorEvent {
  type: 'error';
  messages: string[];
}

export type BoltEvent = WebcontainerErrorEvent;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach(callback => callback(...args));
  }
}

export const eventBus = new EventEmitter();
