
This application is using React + Vite with the following setup:

### Main addons:
- `@dnd-kit` - Drag and drop functionality
- `reactflow` - Flow canvas/diagram support
- `i18n` - Internationalization
- `@mantine/core` - UI component library
- `recharts` - Charts and visualizations
- `sass` - SCSS support for stylesheets

### TypeScript with Type-Aware Linting

This project is configured with **TypeScript** and **type-aware ESLint rules** enabled for production-grade code quality.

#### Features:

- **Full TypeScript support** - All source files in `src/` are linted with TypeScript
- **Type-aware rules** - ESLint rules that understand your type information
- **Strict mode** - `strict: true` in `tsconfig.json` for maximum type safety
- **React JSX** - Full support for React 19 with JSX

#### Key configurations:

**TypeScript:**
- `tsconfig.json` - Main TypeScript configuration with strict mode
- `tsconfig.node.json` - Config for build and config files

**ESLint:**
- `eslint.config.js` - Configured with `@typescript-eslint` for type checking
- Covers both `.js/.jsx` files and `.ts/.tsx` files with appropriate rules

#### Running type checks:

```bash
npm run lint      # Run ESLint with TypeScript type-aware rules
npm run build     # Build with type checking (Vite)
npm run dev       # Start dev server with hot reload
```

#### Common lint errors and fixes:

- **Unused variables** - Remove or prefix with `_` to ignore
- **Floating promises** - Await promises or use `.catch()` / `.then()`
- **Unsafe `any` types** - Provide proper TypeScript types
- **Unsafe arguments** - Ensure type compatibility

See [typescript-eslint documentation](https://typescript-eslint.io) for more details on type-aware linting.

### Workflow Canvas - Connection Rules

The workflow canvas (`FlowCanvas.tsx`) uses React Flow to let users build workflows by connecting nodes (blocks, devices, sub-workflows).

Each node exposes **two input connectors** (top, left) and **two output connectors** (bottom, right). When creating edges between nodes, the following validation rules apply:

- **Port consistency per node**: Once a node's first connection is made on a given connector, all subsequent connections of the same direction must use the same connector.
  - *Output*: If a node's first outgoing edge leaves from `source-bottom`, all future outgoing edges from that node must also use `source-bottom`.
  - *Input*: If a node's first incoming edge arrives at `target-top`, all future incoming edges to that node must also use `target-top`.
- **No duplicate edges**: Only one edge is allowed between the same source/target node pair.

This is enforced via the `isValidConnection` callback passed to the `<ReactFlow>` component.

#### Edge handle persistence

Each edge stores which connector it is attached to on both ends (`sourceHandle` and `targetHandle`, e.g. `source-bottom`, `target-top`). These handles are persisted to the database so that after saving and reloading a workflow, the port consistency validation still works correctly. Without persisted handles, reloaded edges would have no handle info and block all new connections.

### Sub-workflow Creation

Users can extract a group of nodes into a new sub-workflow directly from the canvas.

#### How it works

1. **Enter selection mode** — Click the pointer icon in the toolbar.
2. **Draw a selection** — Left-click drag on the canvas to draw a rectangle around the nodes to extract. React Flow's native selection rectangle is shown during the drag.
3. **Area overlay appears** — On mouse release, a dashed bounding box (the "area") is locked around the selected region. The area color indicates validity: **blue** = valid, **orange** = invalid.
4. **Adjust the area** — Drag the 8 resize handles (corners + edges) to include/exclude nodes. Nodes whose center falls inside the area are automatically tracked. Moving nodes in or out of the area updates the set in real time.
5. **Name the sub-workflow** — Type a name in the text input that appears in the toolbar.
6. **Validate and create** — Click the checkbox button (enabled only when the area is valid).

#### Validation rules

The area is **valid** when all of these conditions are met:

- **Input boundary**: All edges entering the area from outside must arrive at the **same internal connector** (same target node + same target handle). Multiple edges from different external nodes to the same connector are allowed.
- **Output boundary**: All edges leaving the area to the outside must depart from the **same internal connector** (same source node + same source handle). Multiple edges to different external nodes from the same connector are allowed.
- **Name**: Must be non-empty and unique among the parent experiment's workflows.

#### What happens on creation

1. A new workflow is created in the experiment via the API.
2. The selected nodes and their internal edges are saved into the new workflow.
3. On the current canvas, the selected nodes are replaced by a single **workflow node** positioned at the area center, referencing the new sub-workflow.
4. Boundary-crossing edges are reconnected to the workflow node (preserving handle types).
5. The current workflow is saved and the experiments sidebar is refreshed.

#### Editing a sub-workflow

Workflow nodes display a pencil icon on hover (top-right corner). Clicking it navigates to the sub-workflow's canvas for editing.

#### Key files

- `WorkflowsPage.tsx` — Selection mode UI, area validation, `handleCreateSubWorkflow` handler.
- `FlowCanvas.tsx` — Selection tracking, mouseup-based area locking, node containment by center point, area overlay rendering.
- `AreaOverlay.tsx` — Dashed bounding box with resize handles and close button. Accepts locked bounds, renders outside ReactFlow for clickability.
- `WorkflowNode.tsx` — Workflow node component with delete and edit buttons.

### Workflow Hierarchy & Breadcrumb Navigation

Workflows support a many-to-many parent-child hierarchy via the `subflows` table. A workflow can appear as a sub-workflow in multiple parent workflows (e.g., `sub3` used in both `Main` and `sub1`).

#### Cycle prevention

When editing a workflow, the sidebar hides ancestor workflows to prevent cycles. Ancestors are computed via BFS on the `subflows` graph. The backend also rejects save requests that would create a cycle.

#### Breadcrumb

The toolbar displays a navigation-based breadcrumb trail:

```text
Experiments > Experiment Name > Root Workflow > ... > Parent Workflow > Current Workflow
```

- **Experiments** and **Experiment Name** link back to the experiments page.
- Each **ancestor workflow** is a clickable link that navigates to that workflow's canvas.
- The **current workflow** name is displayed as plain text (non-clickable).

Since a workflow can have multiple parents, the breadcrumb uses a **navigation-based** approach: when clicking into a sub-workflow, a `?from=<parentWorkflowId>` query parameter is added to the URL. The breadcrumb walks up from the `from` param through the `subflows` graph. If no `from` param is present, it picks any parent.

#### Data model

- `subflows` table — Join table with `workflow_id` (the child) and `parent_id` (the workflow containing it). A workflow can have multiple entries (multiple parents).
- `nodes.subflow_id` — Foreign key to `subflows.id` (not directly to a workflow). The backend creates/manages `Subflow` records automatically when saving a workflow that contains workflow nodes.
- `Experiment.to_dict()` includes a `subflows` array so the frontend can build the full hierarchy graph without extra API calls.

### Devices

Installed devices appear as cards on the Devices page and as draggable items in the workflow sidebar. Each device has a **mode** that controls its operational state, indicated by a colored left-border.

#### Mode colors

| Mode         | Label | Color  | Border    | Description                  |
|--------------|-------|--------|-----------|------------------------------|
| `activate`   | On    | Green  | `#22c55e` | Device is active and running |
| `deactivate` | Off   | Gray   | `#9ca3af` | Device is inactive           |
| `simulate`   | Sim   | Orange | `#f59e0b` | Device runs in simulation    |

Colors are defined in `src/css/colors.scss` (`$device-on`, `$device-off`, `$device-simulate`) and applied via CSS classes `mode-activate`, `mode-deactivate`, `mode-simulate`.

#### Bus identifier on device cards

When a device uses a connection type that defines a `slave_id` or `bus_id` in its `device_settings` (see `pieces/utils/connections.json`), the device card displays this identifier after the bus name. For example, a MODBUS-RTU device with `slave_id: 3` shows `MODBUS-RTU #3`. This helps distinguish multiple devices on the same bus.

#### Related files

- `DevicesGrid.tsx` — Device card grid with mode segmented control and edit/delete actions.
- `SidebarDevicesList.tsx` — Sidebar device list with drag-and-drop support and mode icon indicators.
- `DevicesPage.scss` — Card border-left color styles per mode.
- `WorkflowsPage.scss` — Sidebar device item border and mode icon color styles.
- `css/colors.scss` — Color variable definitions for all device modes.
