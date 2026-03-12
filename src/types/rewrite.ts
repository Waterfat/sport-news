export interface RewriteStatus {
  lastCompleted: {
    completed_at: string;
    articles_generated: number;
  } | null;
  currentTask: {
    status: string;
    created_at: string;
  } | null;
  newArticleCount: number;
}
