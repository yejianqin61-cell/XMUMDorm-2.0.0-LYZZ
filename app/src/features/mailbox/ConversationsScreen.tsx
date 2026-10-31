/**
 * 私信会话列表页（`M-11`）—— 页面级组合（P2B-03 / 阶段D-01 收敛）
 *
 * 形态依据：
 *   · **骨架**：`P2` 列表 → `K05 ListScreen`（四态与分页状态机只在骨架里实现，⛔ 页面不许自写）
 *   · **归属**：私信在「我的」下面，⛔ 不占 Tab（宪法 4.9.4 + 骨架规范 §2.5 / TO-CONFIRM C-07）
 *   · **取数**：本仓没有 `useQuery`（`p1-17-canteen.test.tsx:565` 断言源码里不出现它），
 *     所以走既有"手工取数外壳"的路子：`listMyChatThreads()` + 分页 reducer
 *
 * 阶段 D-01 起，列表本体的唯一实现在 `./ConversationList` —— 信箱「交易」分类列的也是它
 * （契约：交易 Tab 仅列二手私聊会话）。本文件只负责页面外壳，⛔ 不再重复一份取数/四态。
 *
 * ⚠️ 服务端游标分页已接通（阶段 B-03）：`nextCursor` 由服务端给，没有就停止追加。
 *    旧注释「一次给到上限 100 条、不做分页」已过期，本段即为更正。
 */

import * as React from 'react';

import { Screen } from '@/components/ui/Screen';
import { ConversationList } from './ConversationList';

const SCOPE = { primaryTab: 'me', secondaryTab: 'conversations' } as const;

export function ConversationsScreen(): React.ReactElement {
  return (
    <Screen testID="screen-conversations" titleKey="mailbox.conversations.title" bottomMode="none">
      <ConversationList scope={SCOPE} />
    </Screen>
  );
}
