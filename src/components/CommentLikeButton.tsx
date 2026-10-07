import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function CommentLikeButton({
  commentId,
  userId,
}: {
  commentId: string;
  userId?: string | undefined;
}) {
  const queryClient = useQueryClient();

  const likes = useQuery({
    queryKey: ["comment-likes", commentId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_likes")
        .select("user_id")
        .eq("comment_id", commentId);
      if (error) throw error;
      const rows = data ?? [];
      return { count: rows.length, mine: userId ? rows.some((r) => r.user_id === userId) : false };
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Entre para curtir.");
      if (likes.data?.mine) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("user_id", userId)
          .eq("comment_id", commentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_likes")
          .insert({ user_id: userId, comment_id: commentId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comment-likes", commentId] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro"),
  });

  const count = likes.data?.count ?? 0;
  const mine = likes.data?.mine ?? false;

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className={`flex items-center gap-1 transition-colors ${
        mine ? "font-bold text-primary" : "hover:text-primary"
      }`}
      aria-label="Curtir comentário"
    >
      <ThumbsUp className={`h-3.5 w-3.5 ${mine ? "fill-current" : ""}`} /> {count}
    </button>
  );
}
