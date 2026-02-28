export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  replies: CommentReply[];
  isResolved: boolean;
  quote: string; // The text that was highlighted
}

export interface CommentState {
  comments: Record<string, Comment>;
  activeCommentId: string | null;
}
