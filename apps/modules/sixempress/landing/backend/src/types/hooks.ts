export {};

declare global {
  interface filters {
    filters_test: (nn: number) => number;
  }

  interface actions {
    actions_test: (nn: number) => any;
  }
}
