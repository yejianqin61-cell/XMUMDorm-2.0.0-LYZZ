/**
 * `P3` 详情骨架 —— 落点入口。
 *
 * 依据 README §5-3：`DetailScreen` 在组件定义里没有正式组件 ID，
 * 按 §1.2「原型骨架豁免 9.14-③」落在 `src/proto/P3`（宪法 15.4-3 要求收尾时回写 §2.7）。
 */
export {
  PROTO_ID,
  DetailScreen,
  formatInteractionCount,
  interactionKinds,
  resolveDetailState,
} from './DetailScreen';
export type {
  DetailComments,
  DetailLabels,
  DetailScreenProps,
  DetailState,
  InteractionKind,
  InteractionState,
} from './DetailScreen';
