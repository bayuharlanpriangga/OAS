import type { LastKalkInputState } from "./types";

export const kalkulatorState: {
  lastInput: LastKalkInputState | null;
  slideStyleInjected: boolean;
} = {
  lastInput: null,
  slideStyleInjected: false,
};
