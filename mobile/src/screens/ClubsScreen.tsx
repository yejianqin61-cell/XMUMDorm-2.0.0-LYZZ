import React, { useState } from 'react';
import ClubsHomeScreen from './ClubsHomeScreen';
import ClubProfileScreen from './ClubProfileScreen';
import ClubListScreen from './ClubListScreen';
import MyClubsScreen from './MyClubsScreen';
import ActivityPostDetailScreen from './ActivityPostDetailScreen';
import PublishClubContentScreen from './PublishClubContentScreen';
import ClubMembersScreen from './ClubMembersScreen';

type ViewState =
  | { screen: 'home' }
  | { screen: 'profile'; clubId: number }
  | { screen: 'list' }
  | { screen: 'myClubs' }
  | { screen: 'detail'; targetType: 'activity' | 'post'; id: number }
  | { screen: 'publish'; clubId: number; contentType: 'activity' | 'post' }
  | { screen: 'members'; clubId: number; clubName: string };

export default function ClubsScreen() {
  const [view, setView] = useState<ViewState>({ screen: 'home' });

  switch (view.screen) {
    case 'profile':
      return (
        <ClubProfileScreen
          clubId={view.clubId}
          onBack={() => setView({ screen: 'home' })}
          onMembers={(id, name) => setView({ screen: 'members', clubId: id, clubName: name })}
          onActivity={(id) => setView({ screen: 'detail', targetType: 'activity', id })}
          onPost={(id) => setView({ screen: 'detail', targetType: 'post', id })}
          onPublish={(clubId, type) => setView({ screen: 'publish', clubId, contentType: type })}
        />
      );
    case 'list':
      return <ClubListScreen onBack={() => setView({ screen: 'home' })} onClub={(id) => setView({ screen: 'profile', clubId: id })} />;
    case 'myClubs':
      return <MyClubsScreen onBack={() => setView({ screen: 'home' })} onClub={(id) => setView({ screen: 'profile', clubId: id })} />;
    case 'detail':
      return (
        <ActivityPostDetailScreen
          targetType={view.targetType}
          targetId={view.id}
          onBack={() => setView({ screen: 'home' })}
        />
      );
    case 'publish':
      return (
        <PublishClubContentScreen
          clubId={view.clubId}
          contentType={view.contentType}
          onBack={() => setView({ screen: 'profile', clubId: view.clubId })}
          onDone={() => setView({ screen: 'profile', clubId: view.clubId })}
        />
      );
    case 'members':
      return (
        <ClubMembersScreen
          clubId={view.clubId}
          clubName={view.clubName}
          onBack={() => setView({ screen: 'profile', clubId: view.clubId })}
        />
      );
    default:
      return (
        <ClubsHomeScreen
          onClub={(id) => setView({ screen: 'profile', clubId: id })}
          onList={() => setView({ screen: 'list' })}
          onMyClubs={() => setView({ screen: 'myClubs' })}
          onActivity={(id) => setView({ screen: 'detail', targetType: 'activity', id })}
          onPost={(id) => setView({ screen: 'detail', targetType: 'post', id })}
        />
      );
  }
}
