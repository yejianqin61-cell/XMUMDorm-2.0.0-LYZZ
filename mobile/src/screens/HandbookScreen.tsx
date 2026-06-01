import React, { useState } from 'react';
import HandbookHomeScreen from './HandbookHomeScreen';
import HandbookArticleDetailScreen from './HandbookArticleDetailScreen';
import HandbookEditorScreen from './HandbookEditorScreen';
import HandbookMeScreen from './HandbookMeScreen';
import CourseReviewListScreen from './CourseReviewListScreen';
import CourseReviewDetailScreen from './CourseReviewDetailScreen';
import CourseReviewCreateScreen from './CourseReviewCreateScreen';

type ViewState =
  | { screen: 'home' }
  | { screen: 'articleDetail'; articleId: number }
  | { screen: 'editor'; editId?: number }
  | { screen: 'me' }
  | { screen: 'courseList' }
  | { screen: 'courseDetail'; reviewId: number }
  | { screen: 'courseCreate'; editId?: number };

export default function HandbookScreen() {
  const [view, setView] = useState<ViewState>({ screen: 'home' });

  switch (view.screen) {
    case 'articleDetail':
      return <HandbookArticleDetailScreen articleId={view.articleId} onBack={() => setView({ screen: 'home' })} />;
    case 'editor':
      return <HandbookEditorScreen editId={view.editId} onBack={() => setView({ screen: 'home' })} onDone={() => setView({ screen: 'home' })} />;
    case 'me':
      return <HandbookMeScreen onBack={() => setView({ screen: 'home' })} onArticle={(id) => setView({ screen: 'articleDetail', articleId: id })} onReview={(id) => setView({ screen: 'courseDetail', reviewId: id })} />;
    case 'courseList':
      return <CourseReviewListScreen onBack={() => setView({ screen: 'home' })} onReview={(id) => setView({ screen: 'courseDetail', reviewId: id })} />;
    case 'courseDetail':
      return <CourseReviewDetailScreen reviewId={view.reviewId} onBack={() => setView({ screen: 'home' })} onEdit={(id) => setView({ screen: 'courseCreate', editId: id })} />;
    case 'courseCreate':
      return <CourseReviewCreateScreen editId={view.editId} onBack={() => setView({ screen: 'home' })} onDone={() => setView({ screen: 'home' })} />;
    default:
      return (
        <HandbookHomeScreen
          onArticle={(id) => setView({ screen: 'articleDetail', articleId: id })}
          onNewArticle={() => setView({ screen: 'editor' })}
          onMe={() => setView({ screen: 'me' })}
          onCourseList={() => setView({ screen: 'courseList' })}
          onNewCourseReview={() => setView({ screen: 'courseCreate' })}
        />
      );
  }
}
