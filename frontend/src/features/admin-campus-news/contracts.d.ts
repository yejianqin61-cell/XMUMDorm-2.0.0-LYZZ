export type Category = 'competition' | 'lecture' | 'campus-life';
export type Lifecycle = 'draft' | 'published' | 'withdrawn';
export interface College { id: string; code: string; name: string }
export interface Audience { scope: 'all' | 'colleges'; collegeIds: string[] }
export interface ImageAsset { id: string; url: string; alt?: string }
export interface NewsContent {
  title: string; content: string; category: Category | null;
  audience: Audience | { scope: 'unclassified'; collegeIds: [] }; images: ImageAsset[];
}
export interface CampusNews extends NewsContent {
  id: string; sourceKind: 'news' | 'legacy'; lifecycleStatus: Lifecycle;
  revision: number; hiddenByAdmin: boolean; deletedAt: string | null;
  createdBy: { id: string; name: string }; updatedAt: string; publishedAt: string | null;
}
export interface WriteContent {
  title: string; content: string; category: Category | null; audience: Audience;
  /** Ordered immutable asset IDs. Do not overwrite an existing object's key. */
  imageAssetIds: string[]; expectedRevision?: number;
}
export interface NewsVersion extends NewsContent {
  revision: number; createdAt: string; actor: { id: string; name: string }; action: string;
}
export interface VersionComparison {
  fromRevision: number; toRevision: number;
  changes: { field: string; before: string; after: string }[];
}
/** Proposed contract, not a claim that these endpoints have been implemented. */
export interface CampusNewsAPI {
  list(filters: { search?: string; category?: string; status?: string; collegeId?: string; page: number }): Promise<{ items: CampusNews[]; total: number }>;
  detail(id: string): Promise<CampusNews>;
  createDraft(body: WriteContent): Promise<CampusNews>;
  createPublished(body: WriteContent): Promise<CampusNews>;
  update(id: string, body: WriteContent, previousStatus: Lifecycle): Promise<CampusNews>;
  publish(id: string, expectedRevision: number): Promise<CampusNews>;
  withdraw(id: string, expectedRevision: number): Promise<CampusNews>;
  versions(id: string): Promise<{ items: NewsVersion[] }>;
  compare(id: string, from: number, to: number): Promise<VersionComparison>;
  colleges(): Promise<{ items: College[] }>;
  upload(file: File, onProgress: (percent: number) => void, signal: AbortSignal): Promise<ImageAsset>;
}
