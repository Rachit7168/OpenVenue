import { describe, expect, it } from "vitest";
import {
  clearChromePopover,
  closeChromePanels,
  openChromePopover,
  openFindChrome,
  openSearchChrome,
  type MapChromeState,
} from "./panels.js";

const closed: MapChromeState = { findOpen: false, searchOpen: false, popoverOpen: false };

describe("map chrome open/close", () => {
  it("opens Find and dismisses Search and popover", () => {
    expect(openFindChrome()).toEqual({
      findOpen: true,
      searchOpen: false,
      popoverOpen: false,
    });
  });

  it("opens Search and dismisses Find and popover", () => {
    expect(openSearchChrome()).toEqual({
      findOpen: false,
      searchOpen: true,
      popoverOpen: false,
    });
  });

  it("closes Find and Search without clearing an open popover", () => {
    expect(closeChromePanels({ findOpen: true, searchOpen: false, popoverOpen: true })).toEqual({
      findOpen: false,
      searchOpen: false,
      popoverOpen: true,
    });
  });

  it("opens a place popover by closing panels", () => {
    expect(openChromePopover({ findOpen: true, searchOpen: false, popoverOpen: false })).toEqual({
      findOpen: false,
      searchOpen: false,
      popoverOpen: true,
    });
  });

  it("clears the place popover", () => {
    expect(clearChromePopover({ ...closed, popoverOpen: true })).toEqual(closed);
  });
});
