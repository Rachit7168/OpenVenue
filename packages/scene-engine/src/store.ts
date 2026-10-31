import { CommandStack, type EditorCommand, type ExecuteOptions } from "@openvenue/editor-core";
import type { VenueDocument } from "@openvenue/scene-schema";

export interface SelectionState {
  ids: readonly string[];
}

export interface DocumentChange {
  kind: "document";
  reason: "execute" | "undo" | "redo" | "replace";
  commandType: string | null;
  document: VenueDocument;
}

export interface SelectionChange {
  kind: "selection";
  selection: SelectionState;
}

export type SceneChange = DocumentChange | SelectionChange;

/**
 * Canonical venue document and selection.
 * A Vue layer should subscribe and copy these into editor state.
 * Per-frame camera and renderer state stay outside this store.
 */
export class SceneStore {
  private document: VenueDocument;
  private selection: SelectionState = { ids: [] };
  private readonly history = new CommandStack();
  private readonly listeners = new Set<(change: SceneChange) => void>();

  constructor(document: VenueDocument) {
    this.document = document;
  }

  subscribe(listener: (change: SceneChange) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getDocument(): VenueDocument {
    return this.document;
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
    this.emit({
      kind: "document",
      reason: "execute",
      commandType: command.type,
      document: this.document,
    });
  }

  undo(): void {
    if (!this.history.canUndo) {
      return;
    }
    this.document = this.history.undo(this.document);
    this.emit({
      kind: "document",
      reason: "undo",
      commandType: null,
      document: this.document,
    });
  }

  redo(): void {
    if (!this.history.canRedo) {
      return;
    }
    this.document = this.history.redo(this.document);
    this.emit({
      kind: "document",
      reason: "redo",
      commandType: null,
      document: this.document,
    });
  }

  replaceDocument(document: VenueDocument): void {
    this.history.clear();
    this.document = document;
    this.emit({
      kind: "document",
      reason: "replace",
      commandType: null,
      document: this.document,
    });
  }

  setSelection(ids: readonly string[]): void {
    this.selection = { ids: [...ids] };
    this.emit({ kind: "selection", selection: this.getSelection() });
  }

  private emit(change: SceneChange): void {
    for (const listener of this.listeners) {
      listener(change);
    }
  }
}
