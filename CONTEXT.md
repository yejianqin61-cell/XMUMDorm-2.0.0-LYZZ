# Web Layout Language

This glossary defines ownership of content in the web three-column shell. It keeps every route focused on the student's immediate task instead of turning the middle column into a product explanation area.

## Shell

**Global Shell**:
The stable web frame made of a navigation column, a topic column, and an auxiliary column.
_Avoid_: page layout, page shell

**Navigation Column**:
The global destination column used to move between modules. It does not hold route-specific content.
_Avoid_: left content area, feature sidebar

**Topic Column**:
The middle column for the current route's subject matter. It is filled by one route-owned content flow and has no page-internal right column.
_Avoid_: middle column, main container, viewport

**Auxiliary Column**:
The global right column for optional, non-blocking context. It cannot repeat the topic column's data or hold the route's required action.
_Avoid_: page right column, secondary main content

## Content Ownership

**Topic Content**:
Information and controls directly needed to complete the current route's student task. A dish image on a dish page, a merchant list in a canteen zone, and a comment thread under a post are topic content.
_Avoid_: page decoration, generic feature copy

**Topic Flow**:
The ordered sequence of topic content in the topic column. It may contain same-subject grids or lists, but it remains one continuous route-owned flow.
_Avoid_: portal layout, dashboard split

**Same-Subject Grid**:
Parallel items of one subject that support comparison, such as dishes in a menu or canteen zones. It belongs in the topic flow and is not a second page column.
_Avoid_: internal right column, content sidebar

**Route Task**:
The concrete student goal a route serves, such as finding a merchant, comparing dishes, reading a post, or writing a review. Route task determines what qualifies as topic content.
_Avoid_: feature introduction, module explanation

**Primary Action**:
An action required to progress the route task, such as searching dishes, opening a merchant, publishing a review, or replying to a comment. It belongs with the topic content.
_Avoid_: quick link, auxiliary action

## Exclusions

**Shell Intro Card**:
A card that explains a module, a viewport, a content area, or the design's intended use. It is not topic content and must not appear in the topic column.
_Avoid_: hero description, page capability summary, discovery card

**Repeated Summary**:
Information already present in the topic flow that is rendered again in an auxiliary or internal column. It is not additional context and must be removed.
_Avoid_: snapshot, duplicate stats, side summary

**Internal Secondary Column**:
A second route-level column created inside the topic column for recommendations, shortcuts, explanations, or duplicated data. It is not part of the global shell and is prohibited.
_Avoid_: inner sidebar, page aside, local right rail
