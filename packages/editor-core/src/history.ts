import type { VenueDocument } from "@openvenue/scene-schema";

export type CommandType =
  | "ADD_OBJECT"
  | "MOVE_OBJECT"
  | "ROTATE_OBJECT"
  | "RESIZE_OBJECT"
  | "DELETE_OBJECT"
  | "ADD_WALL"
  | "UPDATE_WALL"
  | "ADD_ROOM"
  | "UPDATE_MATERIAL";

export interface EditorCommand {
  readonly type: CommandType;
  execute(document: VenueDocument): VenueDocument;
  undo(document: VenueDocument): VenueDocument;
  merge?(next: EditorCommand): EditorCommand | null;
}

export interface ExecuteOptions {
  /** Combine with the previous command when both are drags of the same target. */
  merge?: boolean;
}

/** Undo and redo apply the values stored on each command, so the result does not depend on replay order. */
export class CommandStack {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  execute(
    document: VenueDocument,
    command: EditorCommand,
    options: ExecuteOptions = {},
  ): VenueDocument {
    if (options.merge && this.undoStack.length > 0) {
      const last = this.undoStack[this.undoStack.length - 1];
      const merged = last?.merge?.(command) ?? null;
      if (last && merged) {
        const next = command.execute(document);
        this.undoStack[this.undoStack.length - 1] = merged;
        this.redoStack = [];
        return next;
      }
    }

    const next = command.execute(document);
    this.undoStack.push(command);
    this.redoStack = [];
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const command = this.undoStack[this.undoStack.length - 1];
    if (!command) {
      return document;
    }
    const next = command.undo(document);
    this.undoStack.pop();
    this.redoStack.push(command);
    return next;
  }

  redo(document: VenueDocument): VenueDocument {
    const command = this.redoStack[this.redoStack.length - 1];
    if (!command) {
      return document;
    }
    const next = command.execute(document);
    this.redoStack.pop();
    this.undoStack.push(command);
    return next;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
