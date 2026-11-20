/** @vitest-environment jsdom */
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import DialogChrome from "./DialogChrome.vue";

describe("DialogChrome open/close", () => {
  it("opens and closes Find without leaving Search open", async () => {
    const findOpen = ref(false);
    const searchOpen = ref(true);
    const popoverOpen = ref(false);
    const wrapper = mount(DialogChrome, {
      props: {
        findOpen: findOpen.value,
        searchOpen: searchOpen.value,
        popoverOpen: popoverOpen.value,
        "onUpdate:findOpen": (value: boolean) => {
          findOpen.value = value;
        },
        "onUpdate:searchOpen": (value: boolean) => {
          searchOpen.value = value;
        },
        "onUpdate:popoverOpen": (value: boolean) => {
          popoverOpen.value = value;
        },
      },
    });

    await wrapper.get("[data-testid=open-find]").trigger("click");
    await flushPromises();
    await nextTick();
    await wrapper.setProps({
      findOpen: findOpen.value,
      searchOpen: searchOpen.value,
      popoverOpen: popoverOpen.value,
    });

    expect(findOpen.value).toBe(true);
    expect(searchOpen.value).toBe(false);
    expect(wrapper.find("[data-testid=find-panel]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=search-panel]").exists()).toBe(false);

    await wrapper.get("[aria-label='Close find']").trigger("click");
    await wrapper.setProps({
      findOpen: false,
      searchOpen: false,
      popoverOpen: false,
    });
    expect(wrapper.find("[data-testid=find-panel]").exists()).toBe(false);
  });

  it("opens Search and dismisses an open popover", async () => {
    const findOpen = ref(false);
    const searchOpen = ref(false);
    const popoverOpen = ref(true);
    const wrapper = mount(DialogChrome, {
      props: {
        findOpen: findOpen.value,
        searchOpen: searchOpen.value,
        popoverOpen: popoverOpen.value,
        "onUpdate:findOpen": (value: boolean) => {
          findOpen.value = value;
        },
        "onUpdate:searchOpen": (value: boolean) => {
          searchOpen.value = value;
        },
        "onUpdate:popoverOpen": (value: boolean) => {
          popoverOpen.value = value;
        },
      },
    });

    await wrapper.get("[data-testid=open-search]").trigger("click");
    await flushPromises();
    await wrapper.setProps({
      findOpen: findOpen.value,
      searchOpen: searchOpen.value,
      popoverOpen: popoverOpen.value,
    });

    expect(searchOpen.value).toBe(true);
    expect(popoverOpen.value).toBe(false);
    expect(wrapper.find("[data-testid=search-panel]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=place-popover]").exists()).toBe(false);
  });

  it("opens the place popover from a closed state", async () => {
    const wrapper = mount(DialogChrome, {
      props: {
        findOpen: true,
        searchOpen: false,
        popoverOpen: false,
        popoverLabel: "Gnosis",
      },
    });

    expect(wrapper.find("[data-testid=place-popover]").exists()).toBe(false);
    await wrapper.setProps({ findOpen: false, searchOpen: false, popoverOpen: true });
    await nextTick();

    expect(wrapper.find("[data-testid=place-popover]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=find-panel]").exists()).toBe(false);
    expect(wrapper.get("[data-testid=place-popover]").attributes("aria-label")).toBe("Gnosis");
  });

  it("closes the place popover from its close control", async () => {
    const wrapper = mount(DialogChrome, {
      props: {
        findOpen: false,
        searchOpen: false,
        popoverOpen: true,
      },
    });

    expect(wrapper.find("[data-testid=place-popover]").exists()).toBe(true);
    await wrapper.get("[aria-label=Close]").trigger("click");
    expect(wrapper.emitted("closePopover")).toBeTruthy();
  });
});
