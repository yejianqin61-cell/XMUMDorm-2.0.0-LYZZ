import React, { useState } from 'react';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';
import MarketplaceDetailScreen from './MarketplaceDetailScreen';
import MarketplacePublishScreen from './MarketplacePublishScreen';
import MarketplaceMyWantsScreen from './MarketplaceMyWantsScreen';
import MarketplaceChatScreen from './MarketplaceChatScreen';

type ViewState =
  | { screen: 'home' }
  | { screen: 'detail'; itemId: number }
  | { screen: 'publish'; editId?: number }
  | { screen: 'myWants' }
  | { screen: 'chat'; threadId?: number; itemId?: number };

export default function MarketplaceScreen() {
  const [view, setView] = useState<ViewState>({ screen: 'home' });

  switch (view.screen) {
    case 'detail':
      return (
        <MarketplaceDetailScreen
          itemId={view.itemId}
          onBack={() => setView({ screen: 'home' })}
          onEdit={(id) => setView({ screen: 'publish', editId: id })}
          onChat={(threadId, itemId) => setView({ screen: 'chat', threadId, itemId })}
          onChatList={(itemId) => setView({ screen: 'chat', itemId })}
        />
      );
    case 'publish':
      return (
        <MarketplacePublishScreen
          editId={view.editId}
          onBack={() => setView({ screen: 'home' })}
          onDone={() => setView({ screen: 'home' })}
        />
      );
    case 'myWants':
      return (
        <MarketplaceMyWantsScreen
          onBack={() => setView({ screen: 'home' })}
          onItem={(id) => setView({ screen: 'detail', itemId: id })}
        />
      );
    case 'chat':
      return (
        <MarketplaceChatScreen
          threadId={view.threadId}
          itemId={view.itemId}
          onBack={() => setView({ screen: 'home' })}
        />
      );
    default:
      return (
        <MarketplaceHomeScreen
          onDetail={(id) => setView({ screen: 'detail', itemId: id })}
          onPublish={() => setView({ screen: 'publish' })}
          onMyWants={() => setView({ screen: 'myWants' })}
        />
      );
  }
}
