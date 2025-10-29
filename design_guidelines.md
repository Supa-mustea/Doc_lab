# Design Guidelines for Dr's Lab (MilesAI Platform)

## Design Approach

**Selected Approach**: Hybrid Design System with Reference Inspiration

This is a sophisticated AI platform combining therapeutic support and software development tools. The design draws inspiration from:
- **Linear**: Clean, minimal interface with excellent typography and subtle interactions
- **Notion**: Flexible workspace design with clear hierarchy and content organization
- **VS Code**: Professional development environment aesthetics for Studio mode
- **ChatGPT/Claude**: Conversational interface patterns with clear message bubbles

The dual-nature application requires visual differentiation between therapy mode (warm, supportive) and development mode (technical, precise) while maintaining consistent core design patterns.

## Core Design Elements

### A. Typography System

**Primary Font**: System font stack with fallback to sans-serif
- Headings: Font weight 700 (bold), sizes ranging from text-3xl (30px) to text-base (16px)
- Body text: Font weight 400 (normal), text-base (16px) for readability
- Code: Monospace font, text-sm (14px) for optimal code display
- UI labels: Font weight 500 (medium), text-sm (14px)
- Timestamps/meta: Font weight 400, text-xs (12px) in muted colors

**Hierarchy Application**:
- App title/branding: text-xl (20px), font-bold
- Section headers: text-lg (18px), font-semibold
- Chat messages: text-base (16px), font-normal
- Button labels: text-sm (14px), font-medium
- Helper text: text-xs (12px), font-normal

### B. Layout & Spacing System

**Core Spacing Units**: Tailwind units of 2, 4, 8, 12, 16, 20, 24
- Micro spacing (between related elements): p-2, gap-2 (8px)
- Standard spacing (UI components): p-4, gap-4 (16px)
- Section spacing: p-8, gap-8 (32px)
- Large spacing (major sections): p-12, p-16 (48px-64px)
- Panel padding: p-6 for side panels, p-4 for compact areas

**Layout Structure**:
- Sidebar: Fixed width 288px (w-72), full height
- Main content: Flex-1 with max-width constraints (max-w-4xl for chat, full width for Studio)
- Bottom panels: Resizable, min-height 160px, default 250px
- Chat messages: max-w-2xl for optimal reading
- Code editor: Full width/height with no max-width constraints

### C. Component Library

**Navigation & Sidebar**:
- Persistent left sidebar (desktop) with app branding, model selector, and action buttons
- Mobile: Slide-out drawer with overlay backdrop (bg-black/60)
- Button style: Full width, flex items-center, p-3, rounded-lg with hover states
- Active state: bg-slate-200 dark:bg-slate-700/80
- Icons: w-5 h-5, consistent throughout sidebar

**Chat Interface Components**:
- Message bubbles: Rounded-2xl with tail variants (rounded-br-lg for user, rounded-bl-lg for AI)
- User messages: bg-indigo-600 dark:bg-indigo-500, right-aligned
- AI messages: bg-slate-200 dark:bg-slate-700, left-aligned
- Avatar circles: w-9 h-9, rounded-full with subtle background
- Chat input: Rounded-2xl container with border, backdrop-blur-sm effect, focus ring indigo-500

**Studio Components**:
- File tree: Nested structure with indentation (level * 16px), hover states on items
- Code editor: Monaco-style with line numbers, syntax highlighting via react-syntax-highlighter
- Terminal: Monospace font, dark background (slate-900), green/yellow accent text
- Tabs: Horizontal scroll, px-4 py-2, rounded-t-lg, border-b for active state
- Panels: Resizable dividers with drag handles, min/max height constraints

**Tool Cards & Modals**:
- Tool menu: Grid layout, p-4 cards with icon-title-description pattern
- Icons: w-5 h-5 colored accent icons (different colors per tool category)
- Hover: Subtle bg-slate-100 dark:bg-slate-700 transition
- Modal overlays: Fixed inset with backdrop-blur and bg-black/50

**Form Elements**:
- Text inputs: px-4 py-2, rounded-lg, border with focus ring
- Select dropdowns: Full width, p-2, rounded-lg, consistent with inputs
- Buttons: Primary (indigo-600), Secondary (slate-200), Danger (red-600)
- Button padding: px-4 py-2 for standard, px-6 py-3 for prominent actions

**Status & Feedback**:
- Loading states: Animated dots (w-2.5 h-2.5, bounce animation)
- Toast notifications: Bottom-right, rounded-lg, shadow-lg, auto-dismiss
- Progress indicators: Thin bars at top of sections, indigo color
- Empty states: Centered content with icon (w-20 h-20), descriptive text

### D. Visual Treatment

**Color Strategy** (Referenced, not specified):
- Theme implementation: Light and dark mode with consistent semantic mapping
- Accent color: Indigo family for primary actions and focus states
- Neutral palette: Slate gray family for backgrounds and borders
- Semantic colors: Green (success), Yellow (warning), Red (error/delete), Blue (info)
- Code syntax: Prism light theme for light mode, OneDark for dark mode

**Elevation & Depth**:
- Sidebar: border-r with subtle border color
- Chat bubbles: shadow-md for depth without heaviness
- Modals/overlays: shadow-lg for prominence
- Dropdowns/menus: shadow-lg with border
- Floating elements: backdrop-blur-sm for glassmorphism effect

**Borders & Dividers**:
- Standard borders: border border-slate-200 dark:border-slate-700
- Section dividers: border-b or border-t with same colors
- Rounded corners: rounded-lg (8px) for most UI, rounded-2xl (16px) for chat bubbles
- Focus rings: ring-2 ring-indigo-500 for accessibility

**Interactive States**:
- Hover: bg-slate-100 dark:bg-slate-700/50 with transition-colors
- Active/Selected: bg-slate-200 dark:bg-slate-700/80
- Focus: ring-2 ring-indigo-500 focus:outline-none
- Disabled: opacity-50 cursor-not-allowed
- Loading: pulse animation or spinner

### E. Responsive Behavior

**Breakpoints**:
- Mobile (base): Single column, stacked layout, slide-out sidebar
- Tablet (md: 768px): Two-column where appropriate, persistent sidebar option
- Desktop (lg: 1024px): Full multi-panel layout, persistent sidebar

**Mobile Adaptations**:
- Sidebar: Overlay drawer instead of persistent panel
- Menu button: Top-left hamburger icon (visible below md breakpoint)
- Chat input: Reduced padding (p-2 instead of p-4)
- File tree: Full-width overlay instead of side panel
- Bottom panels: Collapsible with toggle, take full width

## Application-Specific Patterns

### Dual-Mode Visual Language

**Therapy/Chat Mode**:
- Warmer, rounded aesthetics with generous whitespace
- Conversational flow with clear message separation
- Emphasis on readability and comfort
- Voice mode indicator: Pulsing microphone icon with indigo accent
- Empty state: Friendly greeting with example prompts in grid

**Studio/Development Mode**:
- Dense information layout with technical precision
- Monospace typography for code areas
- Multi-panel workspace with resizable sections
- Terminal integration with command history
- File operations with clear visual feedback (staged/modified indicators)

### Context Switching

- Model selector: Dropdown in sidebar showing "Gemini" or "MilesAI"
- View switcher: Chat and Studio tabs in sidebar with icon differentiation
- Clear visual indication of active mode/model
- Smooth transitions between modes (avoid jarring color shifts)

### Advanced Interactions

- Voice conversation: Visual feedback during listening (animated wave/pulse)
- Code editing: Real-time syntax highlighting with overlay input technique
- File operations: Context menus with right-click, inline delete buttons on hover
- Terminal: Auto-scroll, command history, execution feedback
- Preview modes: Device frame options (desktop/tablet/mobile) with responsive scaling

## Images

**Hero Imagery**: Not applicable - this is a tool/application, not a marketing site

**Icon System**:
- Custom SVG icon set already implemented
- Consistent 20x20px (w-5 h-5) sizing throughout
- Stroke-based icons with 1.5px stroke width
- Semantic coloring: Tool-specific accent colors, grayscale for UI chrome

**Avatar/Branding**:
- Custom Dr's Lab logo: Illustrated doctor character with mask and headphones
- User avatar: Simple icon in circular container
- No photographic imagery needed for this application

**Code Preview**:
- Syntax-highlighted code blocks with language badges
- Copy button in top-right corner of code blocks
- Line numbers for reference
- Scrollable containers with max-height constraints

This design system prioritizes professional functionality, clear information hierarchy, and seamless mode switching while maintaining visual consistency across the dual-purpose platform.