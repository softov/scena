import type { ComponentNode } from '../sdk/component-graph.js';

// Declarative equivalent of <LoginForm />. Reference 'Porta.LoginForm' from
// agent-sent payloads or any ComponentNode tree.
export const loginFormBlock: ComponentNode = {
  component: 'Porta.LoginForm',
  allowSignup: false,
  allowForgotPassword: false,
};
