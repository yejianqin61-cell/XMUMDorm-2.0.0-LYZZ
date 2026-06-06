---
name: mobile-dev
description: Implement React Native (Expo) mobile features with 1:1 Web UI parity. Use for screens, components, API integration, expo-blur glass effects.
---

# Mobile Development

## Purpose
Implement React Native (Expo) mobile features with 1:1 parity to the Web counterpart. Follow `.claude/rules/mobile.md` and `docs/00-Constitution/移动端约束.md`.

## When to Use
- Assigned a Mobile task from `docs/05-Tasks/`
- Creating new Expo Router screens
- Building RN components with liquid glass effects
- Integrating backend APIs on mobile

## Workflow Stage
`07-Implementation` (Mobile)

## Inputs
- `docs/05-Tasks/` — Assigned task with acceptance criteria
- `docs/04-Module/` — Module design with UI specs
- `docs/00-Constitution/移动端约束.md` — **MUST READ**
- (Reference) Web counterpart: `frontend/src/pages/<Page>.jsx` for 1:1 parity
- (Reference) Web counterpart: `frontend/src/components/<Component>.jsx` for style matching

## Outputs
- `mobile/src/app/<screen>.tsx` — Expo Router screen
- `mobile/src/components/<Component>.tsx` — RN component
- `mobile/src/api/<module>.ts` — API integration (reuse from Web)
- `docs/07-Implement/<feature>-mobile-record.md` — Implementation record

## Rules (from `.claude/rules/mobile.md`)
1. **1:1 Web Parity** — Same hierarchy, same patterns, same API calls
2. **Glass effects** — `expo-blur` with fallback
3. **Lists** — `FlatList`/`FlashList`, NEVER `ScrollView` for large data
4. **Images** — `expo-image`, NEVER bare `Image`
5. **Animations** — Only `transform` + `opacity` (GPU-accelerated)
6. **Touch** — `Pressable`, NOT `TouchableOpacity`
7. **Conditionals** — Ternary, NOT `&&` for false values
8. **Safe areas** — `SafeAreaView` or `useSafeAreaInsets()`

## Component Checklist
- [ ] Loading state (Skeleton)
- [ ] Error state (EmptyState)
- [ ] Empty state (EmptyState)
- [ ] SafeAreaView applied
- [ ] Glass effect via expo-blur (with fallback)
- [ ] API calls through shared `api/` layer
- [ ] StyleSheet.create for all styles
- [ ] Matches Web UI visually
