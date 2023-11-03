export {};

declare global {
  interface filters {
    filters_test: (nn: number) => number;
  }

  interface actions {
    actions_test: (nn: number) => any;
  }

  interface react_hooks {
    stlse_react_hooks_test: (p: {}) => any;
  }
}
