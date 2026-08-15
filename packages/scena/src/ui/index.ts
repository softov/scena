// scena UI module — top-level re-export map. Folder layout:
//
//   basic/       — a2ui v0.10 spec primitives (Row, Column, List, Card,
//                  Button, TextField, Checks, ...). Stay declarative; the
//                  ViewMount renderer resolves DynamicChildList upstream.
//   primitives/  — composed low-level building blocks (Popup, Splitter,
//                  Toolbar, Badge, Alert, Progress, Spinner, Skeleton,
//                  Markdown, HtmlEmbed, Svg, Breadcrumb). Stateless display.
//   blocks/      — composed higher-level reusables (Tree, Listable, ...).
//                  Own interaction state: selection, kbd nav, drag-drop,
//                  right-click context menus.
//   menu/        — picker family (ActionList engine + ContextMenu +
//                  useChatPicker host hook).
//   layouts/     — surface render strategies (Tab, TabPanel, Single, Split,
//                  Stack, Spatial, Rail, Inline, Bar, Floating).

export { registerBuiltins, registerCatalog } from './register.js';

// ─── primitives/ ─────────────────────────────────────────────────────────
export { Splitter } from './layout/Splitter.js';
export { Popup } from './overlay/Popup.js';
export type { PopupProps } from './overlay/Popup.js';
export { Toolbar } from './navigation/index.js';
export type { ToolbarProps } from './navigation/index.js';
export { Badge } from './display/Badge.js';
export type { BadgeProps, BadgeTone } from './display/Badge.js';
export { Breadcrumb } from './navigation/index.js';
export type { BreadcrumbProps, BreadcrumbItem } from './navigation/index.js';
export { Progress } from './display/Progress.js';
export type { ProgressProps } from './display/Progress.js';
export { Spinner } from './display/Spinner.js';
export type { SpinnerProps } from './display/Spinner.js';
export { Skeleton } from './display/Skeleton.js';
export type { SkeletonProps } from './display/Skeleton.js';
export { Markdown } from './display/Markdown.js';
export type { MarkdownProps } from './display/Markdown.js';
export { HtmlEmbed } from './embed/index.js';
export type { HtmlEmbedProps } from './embed/index.js';
export { Svg } from './display/Svg.js';
export type { SvgProps } from './display/Svg.js';
export { Alert } from './display/Alert.js';
export type { AlertProps, AlertTone } from './display/Alert.js';
export { Avatar } from './display/Avatar.js';
export type { AvatarProps, AvatarSize } from './display/Avatar.js';

// ─── blocks/ ─────────────────────────────────────────────────────────────
export { Tree } from './data/index.js';
export type { TreeProps, TreeNode } from './data/index.js';
export { Listable } from './data/index.js';
export type {
  ListableProps,
  ListableColumn,
  ListableCellProps,
  ListableTitleProps,
  ListableSort,
  ListableRenderContext,
} from './data/index.js';
export { DataTable } from './data/index.js';
export type { DataTableProps, DataColumn, DataRow } from './data/index.js';
export { Pagination, Filter } from './data/index.js';
export type { PaginationProps, FilterProps, FilterField } from './data/index.js';

// ─── chart/ — hand-drawn charts (flexbox + SVG, no deps) ──────────────────
export { BarChart, LineChart, Sparkline, Donut } from './chart/index.js';
export type {
  BarChartProps,
  BarChartBar,
  BarChartSegment,
  LineChartProps,
  LineSeries,
  SparklineProps,
  DonutProps,
  DonutSlice,
} from './chart/index.js';

// ─── menu/ ───────────────────────────────────────────────────────────────
// Picker family — ActionList engine + ContextMenu + chat-style host hook.
// See doop-roadmap/ideas/scena/15-command-view.md.
export {
  ActionList,
  ContextMenu,
  ContainerMenu,
  useChatPicker,
  sentinelHas,
  useContextMenu,
  clampCaretIndex,
  getActiveToken,
  replaceActiveToken,
  shortcutMatchesToken,
  canonicalShortcut,
} from './menu/index.js';
export type {
  ActionListProps,
  ContextMenuProps,
  ContainerMenuProps,
  UseChatPickerParams,
  UseChatPickerResult,
  TokenInfo,
} from './menu/index.js';

// ─── campus/ ─────────────────────────────────────────────────────────────
// Generic pan/zoom canvas primitives. Extracted from SpatialLayout so other
// surfaces (flowchart editors, whiteboards, node graphs) can reuse them.
export {
  CampusView,
  CampusNodus,
  CampusStratum,
  CampusVelum,
  CampusMappa,
  useCampus,
  useStratumZoom,
} from './campus/index.js';
export type {
  CampusViewProps,
  CampusNodusProps,
  CampusStratumProps,
  CampusVelumProps,
  CampusMappaProps,
  CampusContextValue,
  CampusBounds,
  CampusViewport,
  CampusController,
  CampusMappaNode,
  CampusNode,
  CampusLayerConfig,
  CampusNodeRenderProps,
  CampusNodeComponent,
  CampusNodeTypes,
  DragMode,
  ResizeMode,
} from './campus/index.js';

// ─── layouts/ ────────────────────────────────────────────────────────────
export {
  TabLayout,
  TabPanelLayout,
  SingleLayout,
  SplitLayout,
  StackLayout,
  SpatialLayout,
  RailLayout,
  InlineLayout,
  BarLayout,
  FloatingLayout,
  registerBuiltinLayouts,
} from './layout/index.js';

// ─── basic/ — a2ui v0.10 spec ────────────────────────────────────────────
export { Card, Divider, Text, Image, Icon } from './display/index.js';
export { DetailList, DetailHeader, DetailContainer, DetailNotFound, AddPlaceholder, SectionTitle } from './display/index.js';
export type { DetailListProps, DetailItem, DetailHeaderProps, DetailHeaderMeta, DetailContainerProps, DetailNotFoundProps, DetailNotFoundAction, AddPlaceholderProps, SectionTitleProps } from './display/index.js';
export { List } from './data/index.js';
export { Tabs } from './navigation/index.js';
export { Link, resolveLinkHref } from './navigation/index.js';
export type { LinkProps, LinkKind } from './navigation/index.js';
export {
  Button,
  ReloadButton,
  TextField,
  CheckBox,
  ChoicePicker,
  Slider,
  DateTimeInput,
  Checks,
  LocaleToggle,
} from './control/index.js';
export type { LocaleToggleProps, LocaleToggleDisplay, ReloadButtonProps } from './control/index.js';
export { Row, Column } from './layout/index.js';
export { Grid } from './layout/index.js';
export type { GridProps } from './layout/index.js';
export { Video, Audio } from './media/index.js';
export { Modal } from './overlay/index.js';
export type { CheckRuleResolved, ChecksProps } from './control/index.js';

// ─── forms/ — JSON Schema form + composable parts ─────────────────────────
// Form / Field / FieldGroup / FormSection / SchemaForm register as catalog
// components. FieldLabel / FieldError / FieldHint are export-only (internal
// parts of Field). See doop-roadmap/ideas/scena/16-forms.md.
export {
  Form,
  FormContext,
  useFormContext,
  Field,
  FieldLabel,
  FieldError,
  FieldHint,
  FieldGroup,
  FormSection,
  FormActions,
  SchemaForm,
  DangerZone,
  SettingsContainer,
  LoginForm,
} from './forms/index.js';
export type {
  FormProps,
  FormContextValue,
  FieldProps,
  FieldLabelProps,
  FieldErrorProps,
  FieldHintProps,
  FieldGroupProps,
  FormSectionProps,
  FormActionsProps,
  FormActionItem,
  SchemaFormProps,
  FormatRenderer,
  FormatRendererProps,
  JsonSchemaField,
  JsonSchemaObject,
  EnumOption,
  DangerZoneProps,
  SettingsContainerProps,
} from './forms/index.js';
