# Life is Roblox - AI Agent Instructions

## Project Architecture

This is a **roblox-ts** project using **React** for UI and **Charm** for state management. The game features a turn-based tactical battle system with squad-based combat mechanics.

### Key Technologies
- **roblox-ts**: TypeScript transpilation to Luau
- **React + ReactRoblox**: Component-based UI system
- **Charm**: Reactive state management with atoms
- **Charm-Sync**: Client-server state synchronization
- **Remo**: Type-safe remote events
- **UI Labs**: Story-driven component development
- **Lapis**: Type-safe data persistence

## Folder Structure & Boundaries

```
src/
├── client/           # Client-only scripts (StarterPlayerScripts)
├── server/           # Server-only scripts (ServerScriptService) 
├── shared/           # Shared modules (ReplicatedStorage/TS-Shared)
├── gui_sharedfirst/  # GUI components (ReplicatedFirst)
├── squad-battle/     # Squad battle game system (ReplicatedStorage/SquadBattle)
└── tests/           # Test files
```

### Critical Architecture Patterns

1. **GuiMothership Pattern**: Centralized GUI management via `GuiMothership.Mount(key, element)` - all UI goes through this singleton
2. **Atom-Based Reactivity**: State uses Charm atoms extensively - prefer `atom(value)` over direct state
3. **Entity-Component System**: Battle entities use changeable stats as atoms for real-time updates
4. **Story-Driven Development**: Use UI Labs stories for component development (`*.story.tsx`)

## Development Workflows

### Building & Running
```bash
npm run build    # Compile TypeScript
npm run dev      # Watch mode compilation
rojo serve       # Start Rojo server for Roblox Studio sync
```

### UI Component Development
1. Create components in `src/gui_sharedfirst/new_components/`
2. Mount via `GuiMothership.Mount('key', <Component />)`
3. Create stories in `src/gui_sharedfirst/stories/` for testing
4. Use `@rbxts/ui-labs` CreateReactStory pattern

### State Management
- Use `Database.GlobalAtoms()` for global state
- Charm atoms for reactive values: `const health = atom(100)`
- Sync client-server with charm-sync via remotes
- Filter sensitive data with `filterPayload()` utility

## Squad Battle System

Core battle flow: `SquadBattle` → `SquadBattleGraphics` → GUI components
- **Entities**: Individual combatants with stats and changeable atoms
- **Squads**: Groups of entities with front/middle/back positioning  
- **Battle**: Turn-based combat with round management
- **Graphics**: Renders battle state via React components

Key files:
- `squad-battle/Battle/index.ts`: Core battle logic
- `squad-battle/Graphics/index.tsx`: UI integration
- `gui_sharedfirst/squad-battle/`: Battle UI components

## Remote Communication

Use typed remotes via Remo:
```typescript
export const serverRemotes = createRemotes({
    startBattle: remote<Server, [players: Player[]]>(),
    // ... other remotes
});
```

Server-client sync via charm-sync handles state synchronization automatically.

## Coding Standards

- **No comments**: Code should be self-documenting
- **Single return**: Return at function end, avoid early returns  
- **AAA game standards**: Clean architecture, performance-conscious
- **React patterns**: Functional components preferred, hooks for state
- **Type safety**: Leverage TypeScript strictly, use proper interfaces

## Testing & Stories

Create UI Labs stories for all components:
```typescript
const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => <YourComponent />);
```

Stories live in `src/gui_sharedfirst/stories/` and provide interactive component testing.
