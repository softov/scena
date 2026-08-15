import type { ComponentNode } from '../types/component-graph.js';

// Declarative equivalent of <LoginForm />. Reference 'Porta.LoginForm' from
// agent-sent payloads or any ComponentNode tree.
export const loginFormBlock: ComponentNode = {
  component: 'Porta.LoginForm',
  allowSignup: false,
  allowForgotPassword: false,
};
