/** Chrome dialog open/close contract for Find, Search, and the place popover. */

export interface MapChromeState {
  findOpen: boolean;
  searchOpen: boolean;
  popoverOpen: boolean;
}

export function openFindChrome(): MapChromeState {
  return { findOpen: true, searchOpen: false, popoverOpen: false };
}

export function openSearchChrome(): MapChromeState {
  return { findOpen: false, searchOpen: true, popoverOpen: false };
}

export function closeChromePanels(state: MapChromeState): MapChromeState {
  return { ...state, findOpen: false, searchOpen: false };
}

export function clearChromePopover(state: MapChromeState): MapChromeState {
  return { ...state, popoverOpen: false };
}

export function openChromePopover(state: MapChromeState): MapChromeState {
  return { ...state, findOpen: false, searchOpen: false, popoverOpen: true };
}
