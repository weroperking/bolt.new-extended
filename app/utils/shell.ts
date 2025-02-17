import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import type { ITerminal } from '~/types/terminal';
import { withResolvers } from './promises';

/**
 * Spawns a new JSH process with fallback terminal dimensions.
 * This function remains unchanged to preserve its original behavior.
 *
 * @param webcontainer The WebContainer instance.
 * @param terminal The ITerminal instance.
 * @returns A promise that resolves to the spawned process.
 */
export async function newShellProcess(webcontainer: WebContainer, terminal: ITerminal) {
  const args: string[] = [];

  // Spawn a JSH process with default terminal size as fallback
  const process = await webcontainer.spawn('/bin/jsh', ['--osc', ...args], {
    terminal: {
      cols: terminal.cols ?? 80,
      rows: terminal.rows ?? 15,
    },
  });

  const input = process.input.getWriter();
  const output = process.output;

  const jshReady = withResolvers<void>();
  let isInteractive = false;

  // Pipe process output to the terminal and wait for the interactive OSC signal
  output.pipeTo(
    new WritableStream({
      write(data) {
        if (!isInteractive) {
          const [, osc] = data.match(/\x1b\]654;([^\x07]+)\x07/) || [];

          if (osc === 'interactive') {
            // wait until we see the interactive OSC
            isInteractive = true;
            jshReady.resolve();
          }
        }
        terminal.write(data);
      },
    }),
  );

  // Forward terminal input to the process once the shell is interactive
  terminal.onData((data) => {
    if (isInteractive) {
      input.write(data);
    }
  });

  await jshReady.promise;
  return process;
}

/**
 * BoltTerminal provides a shell interface with command execution capabilities.
 * It replicates the functionality of the legacy system using a different internal architecture.
 */
export class BoltTerminal {
  private terminal!: ITerminal;
  private process!: WebContainerProcess;
  private outputReader!: ReadableStreamDefaultReader<string>;
  private inputWriter!: WritableStreamDefaultWriter<string>;
  private readyPromise: Promise<void>;
  private readyResolver!: () => void;

  /**
   * Tracks the state of the current command execution.
   */
  public execState?: {
    sessionId: string;
    active: boolean;
    promise?: Promise<any>;
    abort?: () => void;
  };

  private _eventHandlers: { [event: string]: { callback: (...args: any[]) => void; priority: number }[] } = {};

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolver = resolve;
    });
  }

  /**
   * Adds an event handler for the specified event.
   *
   * @param event Event name ('error', 'commandStarted', 'commandFinished', 'initialized')
   * @param callback After event is triggered, this callback will be called.
   * @param priority Callback priority (higher values run first).
   */
  public addEventHandler(event: string, callback: (...args: any[]) => void, priority: number = 0): void {
    if (!this._eventHandlers[event]) {
      this._eventHandlers[event] = [];
    }
    this._eventHandlers[event].push({ callback, priority });
    // Handlers are sorted by priority in descending order
    this._eventHandlers[event].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Removes an event handler for the specified event.
   *
   * @param event Event name.
   * @param callback Callback to remove.
   */
  public removeEventHandler(event: string, callback: (...args: any[]) => void): void {
    const handlers = this._eventHandlers[event];
    if (handlers) {
      const index = handlers.findIndex((handler) => handler.callback === callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Triggers an event and calls all registered event handlers.
   * @param event Event name.
   * @param args Arguments to pass to the event handlers.
   * @protected
   */
  protected triggerEvent(event: string, ...args: any[]): void {
    const handlers = this._eventHandlers[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler.callback(...args);
        } catch (err) {
          console.error(`Error in event handler for '${event}':`, err);
        }
      }
    }
  }

  /**
   * Initializes the BoltTerminal by spawning a new shell process and configuring input/output streams.
   *
   * @param container The WebContainer instance.
   * @param terminal The ITerminal instance.
   */
  public async initialize(container: WebContainer, terminal: ITerminal): Promise<void> {
    this.terminal = terminal;

    // Spawn the shell process
    const args: string[] = [];
    this.process = await container.spawn('/bin/jsh', ['--osc', ...args], {
      terminal: {
        cols: terminal.cols ?? 80,
        rows: terminal.rows ?? 15,
      },
    });

    this.inputWriter = this.process.input.getWriter();
    const [internalStream, displayStream] = this.process.output.tee();

    let interactive = false;
    // Pipe the output to the terminal and wait for the interactive signal
    displayStream.pipeTo(
      new WritableStream({
        write: (chunk: string) => {
          if (!interactive) {
            const [, match] = chunk.match(/\x1b\]654;([^\x07]+)\x07/) || [];
            if (match === 'interactive') {
              interactive = true;
              this.readyResolver();
              this.triggerEvent('initialized'); // Terminal başlatıldığında 'initialized' event'i tetiklenir.
            }
          }
          terminal.write(chunk);
        },
      }),
    );

    // Forward terminal input to the shell process when interactive
    terminal.onData((data: string) => {
      if (interactive) {
        this.inputWriter.write(data);
      }
    });

    this.outputReader = internalStream.getReader();
    await this.readyPromise;
  }

  /**
   * Executes a shell command.
   * If an existing command is running, an interrupt (Ctrl+C) is sent before executing the new command.
   *
   * @param sessionId Identifier for the current session.
   * @param command The command to execute.
   * @param abortCallback Optional callback to abort the running command.
   * @returns The execution result containing the output and exit code.
   */
  public async runCommand(
    sessionId: string,
    command: string,
    abortCallback?: () => void,
  ): Promise<{ output: string; exitCode: number } | undefined> {
    if (!this.process || !this.terminal) {
      return undefined;
    }

    // Interrupt any currently running command
    if (this.execState?.active && this.execState.abort) {
      this.execState.abort();
    }
    // Send Ctrl+C to interrupt the current command
    this.terminal.input('\x03');
    await this.waitForSignal('prompt');

    // Wait for the previous command promise to resolve, if any
    if (this.execState?.promise) {
      try {
        await this.execState.promise;
      } catch (e) {
        this.triggerEvent('error', e); // Trigger an error event if the previous command failed
      }
    }

    // Trigger the command started event
    this.triggerEvent('commandStarted', sessionId, command);

    // Send the new command to the terminal
    this.terminal.input(command.trim() + '\n');
    const executionPromise = this.captureCommandOutput();
    this.execState = { sessionId, active: true, promise: executionPromise, abort: abortCallback };

    const result = await executionPromise;
    this.execState = { sessionId, active: false };

    try {
      result.output = sanitizeTerminalOutput(result.output);
    } catch (error) {
      console.error('Error formatting terminal output:', error);
      this.triggerEvent('error', error);
    }

    // Trigger the command finished event
    this.triggerEvent('commandFinished', sessionId, result);

    return result;
  }

  /**
   * Captures the command output until an 'exit' OSC signal is received.
   *
   * @returns An object containing the aggregated output and the exit code.
   */
  private async captureCommandOutput(): Promise<{ output: string; exitCode: number }> {
    return await this.waitForSignal('exit');
  }

  /**
   * Reads the internal output stream until the specified OSC signal is encountered.
   *
   * @param signal The OSC signal to wait for (e.g., 'prompt' or 'exit').
   * @returns An object with the full output and exit code (if applicable).
   */
  private async waitForSignal(signal: string): Promise<{ output: string; exitCode: number }> {
    let accumulatedOutput = '';
    let exitCode = 0;

    if (!this.outputReader) {
      return { output: accumulatedOutput, exitCode };
    }

    while (true) {
      const { value, done } = await this.outputReader.read();
      if (done) break;
      const chunk = value || '';
      accumulatedOutput += chunk;

      // OSC signal pattern: \x1b]654;[signal]=?((-?\d+):(\d+))?\x07
      const oscRegex = /\x1b\]654;([^\x07=]+)=?((-?\d+):(\d+))?\x07/;
      const match = chunk.match(oscRegex);
      if (match) {
        const oscType = match[1];
        if (oscType === 'exit' && match[3]) {
          exitCode = parseInt(match[3], 10);
        }
        if (oscType === signal) {
          break;
        }
      }
    }
    return { output: accumulatedOutput, exitCode };
  }

  /**
   * Returns the current terminal instance.
   *
   * @returns The ITerminal instance.
   */
  public getTerminal(): ITerminal {
    return this.terminal;
  }

  /**
   * Returns the current shell process.
   *
   * @returns The WebContainerProcess instance.
   */
  public getProcess(): WebContainerProcess {
    return this.process;
  }

  /**
   * Returns a promise that resolves when the shell is ready.
   *
   * @returns A promise that resolves when the shell is interactive.
   */
  public ready(): Promise<void> {
    return this.readyPromise;
  }
}

/**
 * Cleans and formats terminal output while preserving structure and paths.
 * This function removes ANSI escape codes, OSC sequences, and extra control characters.
 *
 * @param input The raw terminal output.
 * @returns The sanitized and formatted output.
 */
export function sanitizeTerminalOutput(input: string): string {
  // Remove OSC sequences
  const noOsc = input
    .replace(/\x1b\](\d+;[^\x07\x1b]*|\d+[^\x07\x1b]*)\x07/g, '')
    .replace(/\](\d+;[^\n]*|\d+[^\n]*)/g, '');
  // Remove ANSI escape sequences
  const noAnsi = noOsc
    .replace(/\u001b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\u001b/g, '')
    .replace(/\x1b/g, '');
  // Normalize newlines
  const normalized = noAnsi
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  // Format output for readability
  const formatted = normalized
    .replace(/^([~\/][^\n❯]+)❯/m, '$1\n❯')
    .replace(/(?<!^|\n)>/g, '\n>')
    .replace(/(?<!^|\n|\w)(error|failed|warning|Error|Failed|Warning):/g, '\n$1:')
    .replace(/(?<!^|\n|\/)(at\s+(?!async|sync))/g, '\nat ')
    .replace(/\bat\s+async/g, 'at async')
    .replace(/(?<!^|\n)(npm ERR!)/g, '\n$1');
  // Clean extra spaces and newlines
  const cleaned = formatted
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/:\s+/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\u0000/g, '');
  return cleaned;
}

/**
 * Factory function to create a new BoltTerminal instance.
 *
 * @returns A new instance of BoltTerminal.
 */
export function createBoltTerminal(): BoltTerminal {
  return new BoltTerminal();
}
