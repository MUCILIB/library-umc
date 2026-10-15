import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// Mocks global untuk environment browser yang umum dipakai di aplikasi react
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock UI Select component with native HTML select for robust jsdom testing
vi.mock("@/components/ui/select", () => {
  function SelectTrigger() {
    return null;
  }

  function SelectValue() {
    return null;
  }

  function SelectContent() {
    return null;
  }

  function SelectItem({ value, children, ...props }: any) {
    return React.createElement("option", { value, ...props }, children);
  }

  function SelectGroup({ children, ...props }: any) {
    return React.createElement("optgroup", props, children);
  }

  function SelectLabel({ children, ...props }: any) {
    return React.createElement("option", { disabled: true, ...props }, children);
  }

  function SelectSeparator() {
    return null;
  }

  function SelectScrollUpButton() {
    return null;
  }

  function SelectScrollDownButton() {
    return null;
  }

  function Select({ value, onValueChange, disabled, children, ...props }: any) {
    let triggerProps: Record<string, any> = {};
    let contentChildren: React.ReactNode = null;

    function traverse(nodes: React.ReactNode) {
      React.Children.forEach(nodes, (child: any) => {
        if (!React.isValidElement(child)) return;
        if (child.type === SelectTrigger) {
          triggerProps = (child.props as any) || {};
        } else if (child.type === SelectContent) {
          contentChildren = (child.props as any)?.children;
        } else if (child.props && (child.props as any).children) {
          traverse((child.props as any).children);
        }
      });
    }

    traverse(children);

    return React.createElement(
      "select",
      {
        id: triggerProps.id,
        "aria-label": triggerProps["aria-label"],
        className: triggerProps.className,
        disabled: disabled || triggerProps.disabled,
        value: value ?? "",
        onChange: (e: any) => onValueChange?.(e.target.value),
        ...props,
      },
      contentChildren
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
  };
});
