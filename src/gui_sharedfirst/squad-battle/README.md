# Squad Battle GUI Components

This folder contains React components for rendering the squad-battle system in the GUI. These are simple first-iteration components designed to be used by the Graphics folder in the squad-battle system.

## Components

### EntityDisplay
Displays basic information about a single entity including:
- Name and Player ID
- Current HP and Stamina
- Location in squad (Front/Middle/Back)
- Team affiliation with color coding

**Props:**
- `name`: Entity name
- `playerID`: Player identifier
- `team`: Team name
- `baseStats`: Entity base statistics
- `changeableStats`: Reactive entity stats (HP, STA, etc.)
- `position?`: Optional UDim2 position

### EntityStats
Detailed stats panel showing all entity statistics:
- Base stats (STR, DEX, ACR, etc.)
- Changeable stats (HP, STA, ORG, POS, MAG)
- Scrollable interface for comprehensive stat viewing

**Props:**
- `name`: Entity name
- `baseStats`: Complete base statistics object
- `changeableStats`: Reactive changeable statistics

### SquadDisplay
Shows a complete squad with entities organized by location:
- Front line, middle line, and back line separation
- Horizontal scrolling for multiple entities per line
- Team color coding and squad information

**Props:**
- `name`: Squad name
- `team`: Team name
- `entities`: Array of squad entities
- `position?`: Optional UDim2 position

### SquadStats
Statistical summary of an entire squad:
- Total health and stamina bars
- Entity count
- Average statistics across all entities
- Color-coded team representation

**Props:**
- `squad`: Squad object with name, team, and entities
- `position?`: Optional UDim2 position

### BattleField
Complete battle overview showing all teams and squads:
- Team-based organization with color coding
- Horizontal scrolling for multiple squads
- Battle information panel (round, team count, etc.)
- Comprehensive battle state visualization

**Props:**
- `squads`: Record mapping team names to squad arrays
- `currentRound?`: Optional current round number

### Example
Demo component showing how to use all the components with sample data.

## Usage

```tsx
import { BattleField, EntityDisplay, SquadDisplay } from "gui_sharedfirst/squad-battle";

// Use in your Graphics components
function MyBattleGraphics() {
    return (
        <BattleField 
            squads={mySquadData} 
            currentRound={currentRound}
        />
    );
}
```

## Integration with Graphics

These components are designed to be imported and used within the Graphics folder of the squad-battle system. They provide:

1. **Reactive Updates**: All components use atoms for real-time stat updates
2. **Team Color Coding**: Automatic color assignment based on team names  
3. **Responsive Layout**: Components adapt to different screen sizes
4. **Modular Design**: Use individual components or complete battle view

## Notes

- Components follow AAA game industry standards
- No comments in code per project guidelines
- Simple first iteration - can be enhanced with animations, effects, etc.
- All components use Roblox GUI elements with proper scaling
- Type-safe with TypeScript and proper error handling