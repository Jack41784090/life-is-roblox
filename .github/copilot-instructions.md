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


## Coding Standards

- **No comments**: Code should be self-documenting
- **Single return**: Return at function end, avoid early returns  
- **AAA game standards**: Clean architecture, performance-conscious
- **React patterns**: Functional components preferred, hooks for state
- **Type safety**: Leverage TypeScript strictly, use proper interfaces
- **Do not use `any`**: Always type explicitly, avoid `as any`
- **Do notuse .length or .size**: use .size() method instead

## Testing & Stories

Create UI Labs stories for all components:
```typescript
const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => <YourComponent />);
```

Stories live in `src/gui_sharedfirst/stories/` and provide interactive component testing.
