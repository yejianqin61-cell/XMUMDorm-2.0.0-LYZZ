import React, { useState } from 'react';
import SquareHomeScreen from './SquareHomeScreen';
import TrendingDetailScreen from './TrendingDetailScreen';
import NewTrendingPostScreen from './NewTrendingPostScreen';
import TrendingPostDetailScreen from './TrendingPostDetailScreen';
import CampusPostDetailScreen from './CampusPostDetailScreen';
import NewCampusPostScreen from './NewCampusPostScreen';
import ClubsScreen from './ClubsScreen';
import MarketplaceScreen from './MarketplaceScreen';
import ErrandsScreen from './ErrandsScreen';
import HandbookScreen from './HandbookScreen';

type ViewState =
  | { screen: 'home' }
  | { screen: 'trendingDetail'; topicId: number; topicTitle: string }
  | { screen: 'newTrendingPost'; topicId: number; topicTitle: string }
  | { screen: 'trendingPostDetail'; postId: number }
  | { screen: 'campusPostDetail'; postId: number }
  | { screen: 'newCampusPost'; tab?: string }
  | { screen: 'clubs' }
  | { screen: 'marketplace' }
  | { screen: 'errands' }
  | { screen: 'handbook' };

export default function SquareScreen() {
  const [view, setView] = useState<ViewState>({ screen: 'home' });

  switch (view.screen) {
    case 'trendingDetail':
      return (
        <TrendingDetailScreen
          topicId={view.topicId}
          topicTitle={view.topicTitle}
          onBack={() => setView({ screen: 'home' })}
          onNewPost={(topicId, topicTitle) => setView({ screen: 'newTrendingPost', topicId, topicTitle })}
          onPostDetail={(postId) => setView({ screen: 'trendingPostDetail', postId })}
        />
      );
    case 'newTrendingPost':
      return (
        <NewTrendingPostScreen
          topicId={view.topicId}
          topicTitle={view.topicTitle}
          onBack={() => setView({ screen: 'trendingDetail', topicId: view.topicId, topicTitle: view.topicTitle })}
          onDone={() => setView({ screen: 'trendingDetail', topicId: view.topicId, topicTitle: view.topicTitle })}
        />
      );
    case 'trendingPostDetail':
      return (
        <TrendingPostDetailScreen
          postId={view.postId}
          onBack={() => setView({ screen: 'home' })}
        />
      );
    case 'campusPostDetail':
      return (
        <CampusPostDetailScreen
          postId={view.postId}
          onBack={() => setView({ screen: 'home' })}
        />
      );
    case 'newCampusPost':
      return (
        <NewCampusPostScreen
          initialTab={view.tab}
          onBack={() => setView({ screen: 'home' })}
          onDone={() => setView({ screen: 'home' })}
        />
      );
    case 'clubs':
      return <ClubsScreen />;
    case 'marketplace':
      return <MarketplaceScreen />;
    case 'errands':
      return <ErrandsScreen />;
    case 'handbook':
      return <HandbookScreen />;
    default:
      return (
        <SquareHomeScreen
          onTrendingDetail={(id, title) => setView({ screen: 'trendingDetail', topicId: id, topicTitle: title })}
          onCampusPostDetail={(id) => setView({ screen: 'campusPostDetail', postId: id })}
          onNewCampusPost={(tab) => setView({ screen: 'newCampusPost', tab })}
          onClubs={() => setView({ screen: 'clubs' })}
          onMarketplace={() => setView({ screen: 'marketplace' })}
          onErrands={() => setView({ screen: 'errands' })}
          onHandbook={() => setView({ screen: 'handbook' })}
        />
      );
  }
}
