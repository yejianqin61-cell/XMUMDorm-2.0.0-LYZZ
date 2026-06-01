import React, { useState } from 'react';
import ErrandsHomeScreen from './ErrandsHomeScreen';
import ErrandDetailScreen from './ErrandDetailScreen';
import PublishErrandScreen from './PublishErrandScreen';

type ViewState =
  | { screen: 'home' }
  | { screen: 'detail'; errandId: number }
  | { screen: 'publish' };

export default function ErrandsScreen() {
  const [view, setView] = useState<ViewState>({ screen: 'home' });

  switch (view.screen) {
    case 'detail':
      return (
        <ErrandDetailScreen
          errandId={view.errandId}
          onBack={() => setView({ screen: 'home' })}
        />
      );
    case 'publish':
      return (
        <PublishErrandScreen
          onBack={() => setView({ screen: 'home' })}
          onDone={(newId) => setView({ screen: 'detail', errandId: newId })}
        />
      );
    default:
      return (
        <ErrandsHomeScreen
          onDetail={(id) => setView({ screen: 'detail', errandId: id })}
          onPublish={() => setView({ screen: 'publish' })}
        />
      );
  }
}
