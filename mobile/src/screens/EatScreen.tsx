import React, { useState } from 'react';
import CanteenHomeScreen from './CanteenHomeScreen';
import FoodListScreen from './FoodListScreen';
import FoodDetailScreen from './FoodDetailScreen';
import CanteenSearchScreen from './CanteenSearchScreen';
import RankingsScreen from './RankingsScreen';
import FoodReviewPublishScreen from './FoodReviewPublishScreen';

type ViewState = { screen: 'home' }
  | { screen: 'shops'; region: any }
  | { screen: 'detail'; product: any }
  | { screen: 'search' }
  | { screen: 'rankings' }
  | { screen: 'review'; product: any };

export default function EatScreen() {
  const [view, setView] = useState<ViewState>({ screen: 'home' });

  const navigate = (screen: string, params?: any) => {
    if (screen === 'shops') setView({ screen: 'shops', region: params });
    else if (screen === 'detail') setView({ screen: 'detail', product: params });
    else if (screen === 'search') setView({ screen: 'search' });
    else if (screen === 'rankings') setView({ screen: 'rankings' });
    else if (screen === 'review') setView({ screen: 'review', product: params });
    else setView({ screen: 'home' });
  };

  switch (view.screen) {
    case 'shops': return <FoodListScreen region={view.region} onBack={() => setView({screen:'home'})} onProduct={(p) => setView({screen:'detail',product:p})} />;
    case 'detail': return <FoodDetailScreen product={view.product} onBack={() => setView({screen:'home'})} onReview={(p) => setView({screen:'review',product:p})} />;
    case 'search': return <CanteenSearchScreen onBack={() => setView({screen:'home'})} onSelect={(p) => setView({screen:'detail',product:p})} />;
    case 'rankings': return <RankingsScreen onBack={() => setView({screen:'home'})} />;
    case 'review': return <FoodReviewPublishScreen product={view.product} onBack={() => setView({screen:'detail',product:view.product})} />;
    default: return <CanteenHomeScreen onNavigate={navigate} />;
  }
}
