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
  const [history, setHistory] = useState<ViewState[]>([]);

  const navigate = (v: ViewState) => {
    setHistory((prev) => [...prev, view]);
    setView(v);
  };
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setView(prev);
    } else {
      setView({ screen: 'home' });
    }
  };

  switch (view.screen) {
    case 'trendingDetail':
      return (
        <TrendingDetailScreen
          topicId={view.topicId}
          topicTitle={view.topicTitle}
          onBack={goBack}
          onNewPost={(topicId, topicTitle) => navigate({ screen: 'newTrendingPost', topicId, topicTitle })}
          onPostDetail={(postId) => navigate({ screen: 'trendingPostDetail', postId })}
        />
      );
    case 'newTrendingPost':
      return (
        <NewTrendingPostScreen
          topicId={view.topicId}
          topicTitle={view.topicTitle}
          onBack={goBack}
          onDone={goBack}
        />
      );
    case 'trendingPostDetail':
      return (
        <TrendingPostDetailScreen
          postId={view.postId}
          onBack={goBack}
        />
      );
    case 'campusPostDetail':
      return (
        <CampusPostDetailScreen
          postId={view.postId}
          onBack={goBack}
        />
      );
    case 'newCampusPost':
      return (
        <NewCampusPostScreen
          initialTab={view.tab}
          onBack={goBack}
          onDone={goBack}
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
          onTrendingDetail={(id, title) => navigate({ screen: 'trendingDetail', topicId: id, topicTitle: title })}
          onCampusPostDetail={(id) => navigate({ screen: 'campusPostDetail', postId: id })}
          onNewCampusPost={(tab) => navigate({ screen: 'newCampusPost', tab })}
          onClubs={() => navigate({ screen: 'clubs' })}
          onMarketplace={() => navigate({ screen: 'marketplace' })}
          onErrands={() => navigate({ screen: 'errands' })}
          onHandbook={() => navigate({ screen: 'handbook' })}
        />
      );
  }
}
