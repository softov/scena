import { registerMessages } from '@softov/scena';

// Dev i18n messages. Nested (tree) shape — exactly an `en.json`. Keys resolve as
// tree paths: `$/t/wall/title`, t('wall.title'), t('wall/title') all hit the
// same node. Switch with setLocale('pt') (exposed on window in dev).
export function registerDevMessages(): void {
  registerMessages('en', {
    field: {
      nameLabel: 'Name',
      emailLabel: 'Email',
      teamLabel: 'Team',
    },
    auth: {
      required: 'Username and password are required.',
      invalid: 'Invalid username or password.',
      failed: 'Login failed ({status}).',
      missingToken: 'Login response missing token.',
      providerLabel: 'Continue with {provider}',
      signIn: 'Sign in.',
      usernameLabel: 'Email or username',
      passwordLabel: 'Password',
      phoneLabel: 'Phone number',
      emailLabel: 'Email address',
      magicLink: 'Email a sign-in link',
      smsOtp: 'Sign in with SMS',
      sendCode: 'Send code',
      sendLink: 'Send link',
    },
    wall: {
      title: 'scena · dev playground',
      subtitle: 'Try demo@scena.dev / demo, or admin@scena.dev / admin.',
    },
    demo: { greeting: 'Hello from i18n' },
  }, { emoji: '🇺🇸', name: 'English' });
  registerMessages('pt', {
    field: {
      nameLabel: 'Nome',
      emailLabel: 'Email',
      teamLabel: 'Equipe',
    },
    auth: {
      required: 'Usuário e senha são obrigatórios.',
      invalid: 'Usuário ou senha inválidos.',
      failed: 'Falha no login ({status}).',
      missingToken: 'Resposta de login sem token.',
      providerLabel: 'Continuar com {provider}',
      signIn: 'Entrar',
      usernameLabel: 'Email ou usuário',
      passwordLabel: 'Senha',
      phoneLabel: 'Número de telefone',
      emailLabel: 'Endereço de email',

      magicLink: 'Enviar link de login por email',
      smsOtp: 'Entrar com SMS',
      sendCode: 'Enviar código',
      sendLink: 'Enviar link',
    },
    wall: {
      title: 'scena · ambiente de testes',
      subtitle: 'Use demo@scena.dev / demo, ou admin@scena.dev / admin.',
    },
    demo: { greeting: 'Olá do i18n' },
  }, { emoji: '🇧🇷', name: 'Português' });
}
