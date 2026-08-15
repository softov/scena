export interface ShowcaseUser {
  id: string;
  name: string;
  email: string;
  team: string;
}

export const MOCK_USERS: ShowcaseUser[] = [
  { id: 'u_1', name: 'Ada Lovelace',      email: 'ada@analytical.engine',    team: 'Engineering' },
  { id: 'u_2', name: 'Alan Turing',       email: 'alan@bletchley.park',      team: 'Engineering' },
  { id: 'u_3', name: 'Grace Hopper',      email: 'grace@cobol.dev',          team: 'Engineering' },
  { id: 'u_4', name: 'Edsger Dijkstra',   email: 'edsger@eindhoven.nl',      team: 'Research' },
  { id: 'u_5', name: 'Margaret Hamilton', email: 'margaret@apollo.guidance', team: 'Research' },
  { id: 'u_6', name: 'Barbara Liskov',    email: 'barbara@types.ok',         team: 'Research' },
];

export interface ShowcasePanelDescriptor {
  name: string;
  title: string;
  description: string;
}

export const SHOWCASE_PANELS: ShowcasePanelDescriptor[] = [
  { name: 'Showcase.CatalogLayout',  title: 'Catalog — Layout',       description: 'Row, Column, Card, Divider, List, Tabs, Modal.' },
  { name: 'Showcase.CatalogContent', title: 'Catalog — Content',      description: 'Text, Image, Icon, Video, AudioPlayer.' },
  { name: 'Showcase.CatalogInput',   title: 'Catalog — Input',        description: 'Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput.' },
  { name: 'Showcase.CatalogGrid',    title: 'Catalog — Grid',         description: 'Grid layout — auto-fit, fixed columns, and GridList (DynamicChildList).' },
  { name: 'Showcase.CatalogForm',    title: 'Catalog — Forms',        description: 'SchemaForm (JSON Schema) — controlled + store-bound, side by side.' },
  { name: 'Showcase.CatalogChart',   title: 'Catalog — Charts',       description: 'BarChart / LineChart / Sparkline / Donut — flexbox + SVG, static + live.' },
  { name: 'Showcase.CatalogLink',    title: 'Catalog — Link',         description: 'Link with protocol detection: tel:// / email:// / https://.' },
  { name: 'Showcase.Users',          title: 'Catalog — Users',        description: 'DataTable → row click → DetailHeader + Tabs(Overview DetailList / Settings form).' },
  { name: 'Showcase.Composed',       title: 'Composed examples',      description: 'Contact card, dashboard, login form — composed from the catalog.' },
  { name: 'Showcase.DynamicList',    title: 'Dynamic list + filter',  description: 'DynamicChildList + writeDynamic + computed paths.' },
  { name: 'Showcase.Validation',     title: 'Form with checks',       description: 'TextField + Checks + a2ui basic-catalog validators.' },
  { name: 'Showcase.Dashboard',      title: 'Platform dashboard',     description: 'Live dashboard — static template animated by an onMount store lifecycle.' },
  { name: 'Showcase.SimpleDash',     title: 'Simple dashboard (React)', description: 'React useState + setInterval rebuilding a ComponentNode via <ViewMount>.' },
  { name: 'Showcase.Player',         title: 'Stream player',          description: 'Wire-format message playback: preset / step / play / import.' },
  { name: 'Showcase.Porta',          title: 'Porta + Sigillum (auth)', description: 'Login composer (4 provider kinds) + LockedRegion gates + live session.' },
  { name: 'Showcase.Picker',         title: 'Picker family',           description: 'ActionList + ContextMenu + useChatPicker — patterns 1-15.' },
  { name: 'Showcase.FileExplorer',   title: 'File explorer (Tree)',    description: 'Tree primitive + drag/drop + copy/paste + openers catalog.' },
  { name: 'Showcase.RuntimeRegister',title: 'Runtime opener register', description: 'Register a new viewer at runtime; reactive openWith updates the Explorer menu.' },
];
