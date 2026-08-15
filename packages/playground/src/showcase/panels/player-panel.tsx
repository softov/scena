import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ComponentNode } from '@softov/scena/types';
import {
  MountWrapper,
  ViewMount,
  useScena,
} from '@softov/scena/react';
import { Button } from '@softov/scena/ui';
import './player-panel.css';
import { NAMED_GLYPH } from '@softov/scena/ui/display';

// ── Wire-format helpers ──────────────────────────────────────────────────

const PLAYER_MOUNT_KEY = 'showcase:player';
const PLAYER_DATA_BASE = '$/showcase/player/data';

type MessageType =
  | 'createSurface'
  | 'updateComponents'
  | 'updateDataModel'
  | 'deleteSurface'
  | 'unknown';

function classify(msg: Record<string, unknown>): MessageType {
  if ('createSurface' in msg) return 'createSurface';
  if ('updateComponents' in msg) return 'updateComponents';
  if ('updateDataModel' in msg) return 'updateDataModel';
  if ('deleteSurface' in msg) return 'deleteSurface';
  return 'unknown';
}

interface WireComponentSpec {
  id: string;
  component: string;
  child?: string;
  children?: string[];
  [k: string]: unknown;
}

// Wire-format `updateComponents.components` is a flat array of items, each
// with its own `id`. Our converter expects a by-id object + a root key.
function arrayToById(arr: WireComponentSpec[]): {
  components: Record<string, WireComponentSpec>;
  root: string;
} {
  const byId: Record<string, WireComponentSpec> = {};
  for (const c of arr) byId[c.id] = c;
  const explicitRoot = arr.find((c) => c.id === 'root');
  const root = (explicitRoot ?? arr[0])?.id ?? '';
  return { components: byId, root };
}

// ── Presets ──────────────────────────────────────────────────────────────

interface Preset {
  name: string;
  messages: string[];
}

const CONTACT_FORM: string[] = [
  JSON.stringify({ version: 'v0.10', createSurface: { surfaceId: 'contact_form', catalogId: 'a2ui/v0.10' } }),
  JSON.stringify({
    version: 'v0.10',
    updateComponents: {
      surfaceId: 'contact_form',
      components: [
        { id: 'root', component: 'Card', child: 'form' },
        { id: 'form', component: 'Column', gap: 12, children: ['title', 'first', 'last', 'email', 'pref', 'sep', 'agree', 'submit'] },
        { id: 'title', component: 'Text', text: 'Contact us', variant: 'h2' },
        { id: 'first', component: 'TextField', label: 'First name', value: { path: '/contact/firstName' } },
        { id: 'last',  component: 'TextField', label: 'Last name',  value: { path: '/contact/lastName' } },
        { id: 'email', component: 'TextField', label: 'Email',      value: { path: '/contact/email' }, type: 'email' },
        { id: 'pref', component: 'ChoicePicker', label: 'Preferred contact method', variant: 'radio',
          options: ['email', 'phone', 'sms'], value: { path: '/contact/preference' } },
        { id: 'sep', component: 'Divider' },
        { id: 'agree', component: 'CheckBox', label: 'Subscribe to newsletter', value: { path: '/contact/subscribe' } },
        { id: 'submit', component: 'Button', label: 'Send', variant: 'primary',
          onClick: { event: { name: 'submitContactForm', context: { formId: 'contact_form' } } } },
      ],
    },
  }),
  JSON.stringify({
    version: 'v0.10',
    updateDataModel: {
      surfaceId: 'contact_form',
      path: '/contact',
      value: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@analytical.engine', preference: 'email', subscribe: true },
    },
  }),
  JSON.stringify({ version: 'v0.10', deleteSurface: { surfaceId: 'contact_form' } }),
];

const DASHBOARD: string[] = [
  JSON.stringify({ version: 'v0.10', createSurface: { surfaceId: 'dash', catalogId: 'a2ui/v0.10' } }),
  JSON.stringify({
    version: 'v0.10',
    updateComponents: {
      surfaceId: 'dash',
      components: [
        { id: 'root', component: 'Column', gap: 12, children: ['title', 'kpis', 'progress'] },
        { id: 'title', component: 'Text', text: 'Sales dashboard', variant: 'h2' },
        { id: 'kpis', component: 'Row', gap: 12, children: ['kpi1', 'kpi2', 'kpi3'] },
        { id: 'kpi1', component: 'Card', child: 'kpi1c' },
        { id: 'kpi1c', component: 'Column', gap: 4, children: ['k1l', 'k1v'] },
        { id: 'k1l', component: 'Text', text: 'Revenue', variant: 'caption', muted: true },
        { id: 'k1v', component: 'Text', text: { path: '/metrics/revenue' }, variant: 'h2' },
        { id: 'kpi2', component: 'Card', child: 'kpi2c' },
        { id: 'kpi2c', component: 'Column', gap: 4, children: ['k2l', 'k2v'] },
        { id: 'k2l', component: 'Text', text: 'Users', variant: 'caption', muted: true },
        { id: 'k2v', component: 'Text', text: { path: '/metrics/users' }, variant: 'h2' },
        { id: 'kpi3', component: 'Card', child: 'kpi3c' },
        { id: 'kpi3c', component: 'Column', gap: 4, children: ['k3l', 'k3v'] },
        { id: 'k3l', component: 'Text', text: 'Growth', variant: 'caption', muted: true },
        { id: 'k3v', component: 'Text', text: { path: '/metrics/growth' }, variant: 'h2', tone: 'success' },
        { id: 'progress', component: 'Card', child: 'pc' },
        { id: 'pc', component: 'Column', gap: 8, children: ['pl', 'pb'] },
        { id: 'pl', component: 'Text', text: 'Monthly target', variant: 'h3' },
        { id: 'pb', component: 'Slider', min: 0, max: 100, defaultValue: 45, disabled: true, label: 'Progress', showValue: true },
      ],
    },
  }),
  JSON.stringify({ version: 'v0.10', updateDataModel: { surfaceId: 'dash', path: '/metrics', value: { revenue: '$52,100', users: '3,412', growth: '+12%' } } }),
  JSON.stringify({ version: 'v0.10', updateDataModel: { surfaceId: 'dash', path: '/metrics', value: { revenue: '$125,400', users: '8,392', growth: '+23%' } } }),
];

const NOTIFICATION: string[] = [
  JSON.stringify({ version: 'v0.10', createSurface: { surfaceId: 'notif', catalogId: 'a2ui/v0.10' } }),
  JSON.stringify({
    version: 'v0.10',
    updateComponents: {
      surfaceId: 'notif',
      components: [
        { id: 'root', component: 'Card', title: 'Heads up', child: 'body' },
        { id: 'body', component: 'Row', gap: 8, align: 'center', children: ['icon', 'msg'] },
        { id: 'icon', component: 'Icon', name: 'ℹ', size: 18 },
        { id: 'msg', component: 'Text', text: 'Wire-format messages are processed in order; the surface re-renders incrementally.' },
      ],
    },
  }),
  JSON.stringify({ version: 'v0.10', deleteSurface: { surfaceId: 'notif' } }),
];

const PRESETS: Preset[] = [
  { name: 'Contact form (full lifecycle)', messages: CONTACT_FORM },
  { name: 'Dashboard (data updates)',      messages: DASHBOARD },
  { name: 'Notification',                  messages: NOTIFICATION },
];

// ── Component ────────────────────────────────────────────────────────────

interface ActionEntry {
  ts: number;
  name: string;
  context?: Record<string, unknown>;
}

interface DataEntry {
  path: string;
  value: unknown;
}

export function PlayerPanel() {
  const scena = useScena();

  const [messages, setMessages] = useState<string[]>(PRESETS[0]!.messages);
  const [cursor, setCursor] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [delayMs, setDelayMs] = useState(800);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [surface, setSurface] = useState<ComponentNode | null>(null);
  const [activeSurfaceId, setActiveSurfaceId] = useState<string | null>(null);
  const [dataModel, setDataModel] = useState<DataEntry[]>([]);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [actionLog, setActionLog] = useState<ActionEntry[]>([]);

  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // ── Action listener ───────────────────────────────────────────────────
  // The dynamic resolver emits `scena:action:event` with the mountKey of the
  // ViewMount that triggered the click. Filter to our player's mount key.
  useEffect(() => {
    const sub = scena.events.on('scena:action:event', (ev) => {
      if (ev.mountKey !== PLAYER_MOUNT_KEY) return;
      setActionLog((prev) => [
        ...prev,
        {
          ts: Date.now(),
          name: ev.name,
          context: ev.context as Record<string, unknown> | undefined,
        },
      ]);
    });
    return () => sub.dispose();
  }, [scena]);

  // ── Clean up the player's data namespace on unmount ───────────────────
  useEffect(() => {
    return () => {
      const internal = scena.store as unknown as { _internalKeys?: () => string[] };
      const keys = internal._internalKeys?.() ?? [];
      for (const k of keys) {
        if (k === PLAYER_DATA_BASE || k.startsWith(`${PLAYER_DATA_BASE}/`)) {
          scena.store.delete(k as `$/${string}`);
        }
      }
    };
  }, [scena]);

  // ── Process one wire message ──────────────────────────────────────────
  const processMessage = useCallback(
    (json: string): { log: string; error?: boolean } => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(json);
      } catch {
        return { log: '!! parse error', error: true };
      }
      const kind = classify(parsed);

      if (kind === 'createSurface') {
        const p = parsed.createSurface as { surfaceId: string };
        setSurface(null);
        setActiveSurfaceId(p.surfaceId);
        setDataModel([]);
        return { log: `createSurface → "${p.surfaceId}"` };
      }

      if (kind === 'updateComponents') {
        const p = parsed.updateComponents as { surfaceId: string; components: WireComponentSpec[] };
        const { components, root } = arrayToById(p.components);
        try {
          const node = scena.converters.translate({
            schema: 'a2ui/v0.10',
            surfaceId: p.surfaceId,
            payload: { components, root },
          });
          setSurface(node);
          return { log: `updateComponents → ${p.components.length} components, root="${root}"` };
        } catch (err) {
          return {
            log: `!! translate failed: ${err instanceof Error ? err.message : String(err)}`,
            error: true,
          };
        }
      }

      if (kind === 'updateDataModel') {
        const p = parsed.updateDataModel as {
          surfaceId: string;
          path?: string;
          value: unknown;
        };
        // Path is optional in the spec — when absent, value IS the whole
        // data model at root (`/`). The hierarchical readPath then walks
        // into the stored object for any `/foo` binding inside the surface.
        const path = p.path ?? '/';
        const segment = path === '/' ? '' : path.startsWith('/') ? path.slice(1) : path;
        const absPath = segment ? `${PLAYER_DATA_BASE}/${segment}` : PLAYER_DATA_BASE;
        scena.store.set(absPath as `$/${string}`, p.value);
        setDataModel((prev) => {
          const next = prev.filter((e) => e.path !== path);
          next.push({ path, value: p.value });
          return next;
        });
        return { log: `updateDataModel → path="${path}"` };
      }

      if (kind === 'deleteSurface') {
        const p = parsed.deleteSurface as { surfaceId: string };
        setSurface(null);
        setActiveSurfaceId(null);
        return { log: `deleteSurface → "${p.surfaceId}"` };
      }

      return { log: '!! unknown message', error: true };
    },
    [scena],
  );

  // ── Step / play / reset ───────────────────────────────────────────────
  const stepForward = useCallback(() => {
    setCursor((prev) => {
      const next = prev + 1;
      if (next >= messages.length) {
        setIsPlaying(false);
        return prev;
      }
      const msg = messages[next]!;
      const { log, error } = processMessage(msg);
      setProcessLog((p) => [...p, `[${next}] ${error ? '!! ' : ''}${log}`]);
      return next;
    });
  }, [messages, processMessage]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => stepForward(), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, cursor, delayMs, stepForward]);

  useEffect(() => {
    if (cursor >= messages.length - 1) setIsPlaying(false);
  }, [cursor, messages.length]);

  function handlePlay() {
    if (cursor >= messages.length - 1) {
      handleReset();
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying(true);
    }
  }
  function handlePause() {
    setIsPlaying(false);
  }
  function handleReset() {
    setIsPlaying(false);
    setCursor(-1);
    setSurface(null);
    setActiveSurfaceId(null);
    setDataModel([]);
    setProcessLog([]);
    setActionLog([]);
    // Clear the player's data namespace from the store too.
    const internal = scena.store as unknown as { _internalKeys?: () => string[] };
    const keys = internal._internalKeys?.() ?? [];
    for (const k of keys) {
      if (k === PLAYER_DATA_BASE || k.startsWith(`${PLAYER_DATA_BASE}/`)) {
        scena.store.delete(k as `$/${string}`);
      }
    }
  }

  function loadPreset(idx: number) {
    handleReset();
    setMessages([...PRESETS[idx]!.messages]);
  }

  function removeMessage(idx: number) {
    if (idx <= cursor) return;
    setMessages((prev) => prev.filter((_, i) => i !== idx));
  }

  // Parse raw text into an array of stringified messages. Accepts:
  //   - single message object: { version, createSurface: {...} }
  //   - array of messages:     [ {...}, {...} ]
  //   - wrapper file:          { name, description, messages: [...] }   (a2ui gallery format)
  //   - newline-delimited JSON
  function parseImportText(raw: string): string[] {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('empty');
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Try newline-delimited
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
      return lines.map((l) => {
        JSON.parse(l);
        return l;
      });
    }
    if (Array.isArray(parsed)) {
      return parsed.map((x) => JSON.stringify(x));
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.messages)) {
        return (obj.messages as unknown[]).map((x) => JSON.stringify(x));
      }
      return [JSON.stringify(parsed)];
    }
    throw new Error('unrecognized shape');
  }

  function applyImport(mode: 'add' | 'replace'): void {
    try {
      const parsed = parseImportText(importJson);
      if (parsed.length === 0) throw new Error('no messages');
      if (mode === 'replace') {
        handleReset();
        setMessages(parsed);
      } else {
        setMessages((prev) => [...prev, ...parsed]);
      }
      setImportJson('');
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'invalid json');
    }
  }

  // File upload reads JSON and applies it as a replace (the typical UX:
  // load a saved scenario file and start fresh).
  const fileInputRef = useRef<HTMLInputElement>(null);
  function triggerUpload(): void {
    fileInputRef.current?.click();
  }
  async function onFilePicked(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportText(text);
      if (parsed.length === 0) throw new Error('no messages in file');
      handleReset();
      setMessages(parsed);
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'failed to read file');
    }
  }

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="player-shell">
      {/* Left: queue + import */}
      <div className="player-pane">
        <div className="player-header">
          <span className="player-header__title">Stream player</span>
          <span className="player-header__sub">{messages.length} msg</span>
          <span className="player-header__spacer" />
          <select
            value=""
            onChange={(e) => {
              const idx = Number(e.currentTarget.value);
              if (!Number.isNaN(idx)) loadPreset(idx);
            }}
          >
            <option value="" disabled>
              Preset…
            </option>
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="player-controls">
          {isPlaying ? (
            <Button label="Pause" onClick={handlePause} />
          ) : (
            <Button label="Play" variant="primary" onClick={handlePlay} />
          )}
          <Button label="Step" onClick={stepForward} disabled={cursor >= messages.length - 1} />
          <Button label="Reset" onClick={handleReset} />
          <span className="player-controls__delay">
            delay
            <input
              type="number"
              step={50}
              value={delayMs}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDelayMs(Math.max(100, Number(e.currentTarget.value) || 800))
              }
            />
            ms
          </span>
        </div>

        <div className="player-queue">
          {messages.map((m, idx) => {
            const isCursor = idx === cursor;
            const isPlayed = idx < cursor;
            const isPending = idx > cursor;
            let type: MessageType = 'unknown';
            try {
              type = classify(JSON.parse(m));
            } catch {
              /* */
            }
            const cls = [
              'player-msg',
              isCursor ? 'player-msg--cursor' : '',
              isPlayed ? 'player-msg--played' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const typeCls =
              type === 'createSurface'
                ? 'player-msg__type--create'
                : type === 'updateComponents'
                  ? 'player-msg__type--comp'
                  : type === 'updateDataModel'
                    ? 'player-msg__type--data'
                    : type === 'deleteSurface'
                      ? 'player-msg__type--delete'
                      : '';
            const typeLabel =
              type === 'createSurface'
                ? 'create'
                : type === 'updateComponents'
                  ? 'comp'
                  : type === 'updateDataModel'
                    ? 'data'
                    : type === 'deleteSurface'
                      ? 'delete'
                      : '?';
            const isExpanded = expandedIdx === idx;
            return (
              <div key={idx} className={cls}>
                <div className="player-msg__row">
                  <button
                    type="button"
                    className="player-msg__idx"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    title={isExpanded ? 'Collapse' : 'Expand JSON'}
                  >
                    {idx}
                  </button>
                  <span className={`player-msg__type ${typeCls}`}>{typeLabel}</span>
                  {isCursor ? <span>▶</span> : null}
                  {isPlayed ? <span>✓</span> : null}
                  <span className="player-msg__spacer" />
                  {isPending ? (
                    <button
                      type="button"
                      className="player-msg__close"
                      onClick={() => removeMessage(idx)}
                      title="Remove"
                    >
                      {NAMED_GLYPH.closePanel}
                    </button>
                  ) : null}
                </div>
                {isExpanded ? (
                  <pre className="player-msg__detail">{formatJson(m)}</pre>
                ) : null}
              </div>
            );
          })}
          {messages.length === 0 ? (
            <div className="player-side-empty">No messages. Load a preset or import below.</div>
          ) : null}
        </div>

        <div className="player-import">
          <div className="player-import__head">
            <span>Messages</span>
            <div className="player-import__actions">
              <Button label="📂 Import" onClick={triggerUpload} />
              <Button label="➕ Add" variant="primary" onClick={() => applyImport('add')} />
              <Button label="♻ Replace" variant="danger" onClick={() => applyImport('replace')} />
            </div>
          </div>
          <textarea
            placeholder='Paste JSON: single { … }, array [ … ], or wrapper { messages: [ … ] } (a2ui gallery format).'
            value={importJson}
            onChange={(e) => {
              setImportJson(e.currentTarget.value);
              setImportError(null);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={onFilePicked}
          />
          {importError ? (
            <div className="player-import__error">{importError}</div>
          ) : null}
        </div>
      </div>

      {/* Center: live surface + data preview */}
      <div className="player-pane">
        <div className="player-header">
          <span className="player-header__title">Surface preview</span>
          {activeSurfaceId ? (
            <span className="player-header__sub">{activeSurfaceId}</span>
          ) : null}
        </div>
        <div className="player-surface">
          {surface ? (
            <MountWrapper
              mountKey={PLAYER_MOUNT_KEY}
              dataContext={PLAYER_DATA_BASE as `$/${string}`}
            >
              <ViewMount node={surface} />
            </MountWrapper>
          ) : (
            <div className="player-surface__placeholder">
              {cursor < 0
                ? 'Press Play or Step to start processing messages.'
                : 'No active surface (deleted or empty).'}
            </div>
          )}
        </div>
        {dataModel.length > 0 ? (
          <div className="player-data">
            <div className="player-side-section__title">Data model</div>
            <pre>{JSON.stringify(dataSnapshot(dataModel), null, 2)}</pre>
          </div>
        ) : null}
      </div>

      {/* Right: process log + action log */}
      <div className="player-pane">
        <div className="player-side-section">
          <div className="player-side-section__title">Process log</div>
          {processLog.length === 0 ? (
            <div className="player-side-empty">No messages processed.</div>
          ) : (
            processLog.map((entry, i) => (
              <div
                key={i}
                className={`player-side-entry ${entry.includes('!!') ? 'player-side-entry--err' : ''}`}
              >
                {entry}
              </div>
            ))
          )}
        </div>
        <div className="player-side-section">
          <div className="player-side-section__title">
            Action events {actionLog.length > 0 ? `(${actionLog.length})` : ''}
          </div>
          {actionLog.length === 0 ? (
            <div className="player-side-empty">Click buttons inside the surface to see events.</div>
          ) : (
            actionLog.map((a, i) => (
              <div key={i} className="player-action">
                <span className="player-action__name">{a.name}</span>
                <div className="player-action__src">
                  {new Date(a.ts).toLocaleTimeString()}
                </div>
                {a.context ? <pre>{JSON.stringify(a.context, null, 2)}</pre> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Pretty-print JSON for the expandable detail row. Falls back to the raw
// string if parsing fails (shouldn't happen — the queue only holds valid JSON).
function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// Flatten last-write-wins entries into a hierarchical view for display only.
function dataSnapshot(entries: DataEntry[]): unknown {
  const root: Record<string, unknown> = {};
  for (const { path, value } of entries) {
    const segs = path.split('/').filter(Boolean);
    if (segs.length === 0) return value;
    let cur: Record<string, unknown> = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i]!;
      if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
      cur = cur[k] as Record<string, unknown>;
    }
    cur[segs[segs.length - 1]!] = value;
  }
  return root;
}

