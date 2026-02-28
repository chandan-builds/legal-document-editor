'use client';

import { useState, useEffect } from 'react';
import { User, MessageSquare, Check, Trash, Reply } from 'lucide-react';
import { Comment, CommentReply } from '@/types/comment';
import { cn } from '@/utils/cn';

interface CommentSidebarProps {
  comments: Record<string, Comment>;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (commentId: string, text: string) => void;
  currentUser: { name: string; color: string } | null;
}

export default function CommentSidebar({ comments, onResolve, onDelete, onReply, currentUser }: CommentSidebarProps) {
  useEffect(() => {
    console.debug('[DEBUG] CommentSidebar rendered');
  }, []);

  const commentList = Object.values(comments).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col h-full print:hidden">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare size={18} />
          <span>Comments ({commentList.length})</span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {commentList.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm italic">No comments yet. Select some text to add one!</p>
          </div>
        ) : (
          commentList.map((comment) => (
            <CommentCard 
              key={comment.id}
              comment={comment}
              onResolve={() => onResolve(comment.id)}
              onDelete={() => onDelete(comment.id)}
              onReply={(text) => onReply(comment.id, text)}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment, onResolve, onDelete, onReply, currentUser }: { 
  comment: Comment, 
  onResolve: () => void, 
  onDelete: () => void, 
  onReply: (text: string) => void,
  currentUser: any
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply(replyText);
      setReplyText('');
      setIsReplying(false);
    }
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border shadow-sm transition-all",
      comment.isResolved ? "bg-gray-100 opacity-60" : "bg-white"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
            {comment.userName[0].toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-gray-700">{comment.userName}</span>
        </div>
        <span className="text-[10px] text-gray-400">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      
      <p className="text-xs text-gray-400 italic bg-gray-50 p-1 border-l-2 border-gray-200 mb-2 truncate">
        "{comment.quote}"
      </p>

      <p className="text-sm text-gray-800 mb-3">{comment.text}</p>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-4 pl-3 border-l-2 border-gray-100 flex flex-col gap-2 mb-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-xs">
              <span className="font-semibold text-gray-600 mr-2">{reply.userName}</span>
              <span className="text-gray-700">{reply.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        {!comment.isResolved && (
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="text-[10px] text-gray-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Reply size={12} />
            <span>Reply</span>
          </button>
        )}
        <button 
          onClick={onResolve}
          className={cn(
            "text-[10px] flex items-center gap-1 ml-auto",
            comment.isResolved ? "text-green-600 font-bold" : "text-gray-500 hover:text-green-600"
          )}
        >
          <Check size={12} />
          <span>{comment.isResolved ? "Resolved" : "Resolve"}</span>
        </button>
        <button 
          onClick={onDelete}
          className="text-[10px] text-gray-400 hover:text-red-600 flex items-center gap-1"
        >
          <Trash size={12} />
          <span>Delete</span>
        </button>
      </div>

      {isReplying && (
        <div className="mt-3 flex gap-2">
          <input 
            type="text" 
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
            placeholder="Write a reply..."
            className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button 
            onClick={handleSubmitReply}
            className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
