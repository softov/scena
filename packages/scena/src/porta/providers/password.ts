import type { PortaProvider, Session } from '../provider.js';

export interface PasswordUser {
  email: string;
  password: string;
  displayName?: string;
  permissions?: string[];
}

export interface PasswordProviderOpts {
  users: PasswordUser[];
  label?: string;
}

// Built-in password provider. Matches against an in-memory user table —
// suitable for testbeds and demos. Real applications swap this for one that
// POSTs to a backend.
export function passwordProvider(opts: PasswordProviderOpts): PortaProvider {
  return {
    id: 'password',
    label: opts.label ?? 'Sign in',
    kind: 'form-fields',
    fields: [
      {
        name: 'email',
        label: {
          path: '$/t/auth/usernameLabel',
        },
        // labelKey: 'auth/usernameLabel',
        type: 'email',
        required: true,
        autoComplete: 'email',
      },
      {
        name: 'password',
        label: {
          path: '$/t/auth/passwordLabel',
        },
        // labelKey: 'auth/passwordLabel',
        type: 'password',
        required: true,
        autoComplete: 'current-password',
      },
    ],
    async signin(creds): Promise<Session> {
      console.log('Password provider signin with creds:', creds);
      const { email, password } = creds as { email?: string; password?: string };
      if (!email || !password) throw new Error('Email and password are required.');
      const user = opts.users.find((u) => u.email === email && u.password === password);
      if (!user) throw new Error('Invalid email or password.');
      return {
        userId: user.email,
        displayName: user.displayName ?? user.email,
        email: user.email,
        permissions: user.permissions ?? [],
      };
    },
  };
}
