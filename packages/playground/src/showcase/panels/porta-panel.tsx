import { useScena } from '@softov/scena/react';
import {
  PortaLock,
  Sigillum,
  // Limen,
  useSession,
} from '@softov/scena/porta';
import { Button, Card, Column, LoginForm, Row, Text } from '@softov/scena/ui';
import './porta-panel.css';

// Showcase for the three porta gates + the LoginForm composer.
export function PortaPanel() {
  const scena = useScena();
  const session = useSession();

  return (
    <div className="porta-showcase">
      <Column gap={16}>
        <Text text="Porta + Sigillum" variant="h1" />
        <Text
          text="Three gates with different intents. Sign in with demo@scena.dev / demo (limited) or admin@scena.dev / admin (agents.* wildcard) to unlock the demos."
          muted
        />

        <Row gap={16} align="start">
          <div className="porta-showcase__col">
            <Card title="Porta — login composer">
              <LoginForm allowSignup allowForgotPassword />
            </Card>
          </div>

          <div className="porta-showcase__col">
            <Card title="Sigillum (runtime) — current session">
              {session ? (
                <Column gap={8}>
                  <Row gap={8} align="center" justify="space-between">
                    <Text text={session.displayName ?? session.userId} weight="bold" />
                    <Button
                      label="Sign out"
                      variant="danger"
                      onClick={() => {
                        void scena.commands.execute('sigillum.signout');
                      }}
                    />
                  </Row>
                  <Text text={`userId: ${session.userId}`} variant="caption" muted />
                  {session.email ? (
                    <Text text={`email: ${session.email}`} variant="caption" muted />
                  ) : null}
                  <Text
                    text={`permissions: ${
                      session.permissions?.length ? session.permissions.join(', ') : '(none)'
                    }`}
                    variant="caption"
                    muted
                  />
                </Column>
              ) : (
                <Text text="No session." muted />
              )}
            </Card>

            <Card
              title="<Sigillum> — silent gate"
              subtitle="Renders children only when permitted. Nothing shown when blocked."
            >
              <Column gap={4}>
                <Sigillum permission="agents.write">
                  <Text text="🔑 You have agents.write." tone="success" />
                </Sigillum>
                <Sigillum permission="agents.write" fallback={<Text text="(button hidden — agents.write missing)" muted variant="caption" />}>
                  <Button label="Delete agent" variant="danger" />
                </Sigillum>
              </Column>
            </Card>

            <Card
              title="<PortaLock> — inline gate"
              subtitle="Shows a bordered fallback (LoginForm by default) when blocked."
            >
              <PortaLock permission="agents.write" title="Sign in (agents.write) to continue">
                <Column gap={4}>
                  <Text text="✓ You may edit agents." tone="success" />
                  <Text
                    text="In a real app this is where the AgentEditor would render."
                    variant="caption"
                    muted
                  />
                </Column>
              </PortaLock>
            </Card>

            <Card
              title="<Limen> — preview of the full-page wall"
              subtitle="Wrapping CustomShell with <Limen> turns the whole app into an auth wall when no session."
            >
              <Text
                text="The app's CustomShell is already wrapped in <Limen permission='session.read'> — sign out to see the wall replace this whole shell."
                variant="caption"
                muted
              />
            </Card>
          </div>
        </Row>
      </Column>
    </div>
  );
}
