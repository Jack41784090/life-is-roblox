import EffectsEventBus from "shared/class/battle/Client/Effects";
import { DetailedHitAnalysisData, DetailedHitAnalysisEventData, EffectType } from "./types";

export default class CombatEffectsService {
    private static instance: CombatEffectsService;
    private eventBus: EffectsEventBus;

    private constructor() {
        this.eventBus = EffectsEventBus.getInstance();
    }

    public static getInstance(): CombatEffectsService {
        if (!CombatEffectsService.instance) {
            CombatEffectsService.instance = new CombatEffectsService();
        }
        return CombatEffectsService.instance;
    }

    public showDamage(position: UDim2, damage: number): void {
        this.eventBus.emit(EffectType.Damage, { position, damage });
    }

    public showStyleSwitch(position: UDim2, color: Color3): void {
        this.eventBus.emit(EffectType.StyleSwitch, { position, color });
    }

    public showAbilityReaction(position: UDim2, color: Color3, abilityName: string): void {
        this.eventBus.emit(EffectType.AbilityReaction, { position, color, abilityName });
    }

    public showHitImpact(position: UDim2, color: Color3, impactSize: number): void {
        this.eventBus.emit(EffectType.HitImpact, { position, color, impactSize });
    }

    public showAbilityUse(position: UDim2, color: Color3, abilityName: string): void {
        this.eventBus.emit(EffectType.AbilityUse, { position, color, abilityName });
    }
    public showClashFate(position: UDim2, color: Color3, fate: string): void {
        this.eventBus.emit(EffectType.ClashFate, { position, color, fate });
    }

    public showDetailedHitAnalysis(position: UDim2, analysisData: DetailedHitAnalysisData): void {
        this.eventBus.emit(EffectType.DetailedHitAnalysis, {
            position,
            analysisData
        } as DetailedHitAnalysisEventData);
    }
}
