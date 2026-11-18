"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { AlertDialog as BaseAlertDialog, Modal as BaseModal } from "lojee-ui";

// Client barrel: lojee-ui ships without "use client", so server components import it through here.
export {
  ANIMATED_VARIANTS,
  Accordion,
  AccordionItem,
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  ColorPicker,
  Divider,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  FileUpload,
  GridView,
  Icon,
  Image,
  Input,
  Label,
  Map,
  Navbar,
  NavbarItem,
  MapMarker,
  MapRoute,
  NumberInput,
  PasswordInput,
  Popover,
  SegmentButton,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Stat,
  SuccessState,
  Switch,
  Table,
  Tabs,
  Textarea,
  ThemeProvider,
  ThemeSwitcher,
  Toast,
  Tooltip,
  UserMenu,
} from "lojee-ui";

const noop = () => () => {};

/** lojee-ui's AlertDialog, drawn straight into <body>: its overlay is `position: fixed`, so inside an animated or clipped page wrapper it would only cover that wrapper instead of the whole screen. */
export function AlertDialog(props: ComponentProps<typeof BaseAlertDialog>) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? createPortal(<BaseAlertDialog {...props} />, document.body) : null;
}

/** lojee-ui's Modal, drawn straight into <body> for the same reason: its backdrop then covers the whole screen, not just a transformed or blurred parent */
export function Modal(props: ComponentProps<typeof BaseModal>) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? createPortal(<BaseModal {...props} />, document.body) : null;
}
