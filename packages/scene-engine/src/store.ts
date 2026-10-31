import { CommandStack, type EditorCommand, type ExecuteOptions } from "@openvenue/editor-core";
import type { VenueDocument } from "@openvenue/scene-schema";

export interface SelectionState {
  ids: readonly string[];
}

export interface DocumentChange {
  kind: "document";
  reason: "execute" | "undo" | "redo" | "replace" | "update";
  commandType: string | null;
  document: VenueDocument;
}

export interface SelectionChange {
  kind: "selection";
  selection: SelectionState;
}

export type SceneChange = DocumentChange | SelectionChange;

/** The part of the scene store a renderer is allowed to watch. */
export interface SceneSource {
  getDocument(): VenueDocument;
  subscribe(listener: (change: SceneChange) => void): () => void;
}

/**
 * Canonical venue document and selection.
 * A Vue layer should subscribe and copy these into editor state.
 * Per-frame camera and renderer state stay outside this store.
 */
function cloneDocument(document: VenueDocument): VenueDocument {
  return JSON.parse(JSON.stringify(document)) as VenueDocument;
}

export class SceneStore {
  private document: VenueDocument;
  private selection: SelectionState = { ids: [] };
  private readonly history = new CommandStack();
  private readonly listeners = new Set<(change: SceneChange) => void>();
  private queue: SceneChange[] | null = null;

  constructor(document: VenueDocument) {
    this.document = cloneDocument(document);
  }

  subscribe(listener: (change: SceneChange) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getDocument(): VenueDocument {
    return cloneDocument(this.document);
  }

  getSelection(): SelectionState {
    return { ids: [...this.selection.ids] };
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  execute(command: EditorCommand, options?: ExecuteOptions): void {
    this.document = this.history.execute(this.document, command, options);
    this.emitDocument("execute", command.type);
  }

  undo(): void {
    const command = this.history.peekUndo();
    if (!command) {
      return;
    }
    this.document = this.history.undo(this.document);
    this.emitDocument("undo", command.type);
  }

  redo(): void {
    const command = this.history.peekRedo();
    if (!command) {
      return;
    }
    this.document = this.history.redo(this.document);
    this.emitDocument("redo", command.type);
  }

  replaceDocument(document: VenueDocument): void {
    this.history.clear();
    this.document = cloneDocument(document);
    this.emitDocument("replace", null);
  }

  /** Store a caller-owned document without clearing undo. */
  updateDocument(document: VenueDocument): void {
    this.document = cloneDocument(document);
    this.emitDocument("update", null);
  }

  setSelection(ids: readonly string[]): void {
    this.selection = { ids: [...ids] };
    this.emit({ kind: "selection", selection: this.getSelection() });
  }

  private emitDocument(reason: DocumentChange["reason"], commandType: string | null): void {
    this.emit({
      kind: "document",
      reason,
      commandType,
      document: cloneDocument(this.document),
    });
  }

  private emit(change: SceneChange): void {
    if (this.queue) {
      this.queue.push(change);
      return;
    }
    this.queue = [change];
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (!next) {
          break;
        }
        for (const listener of [...this.listeners]) {
          listener(next);
        }
      }
    } finally {
      this.queue = null;
    }
  }
}
