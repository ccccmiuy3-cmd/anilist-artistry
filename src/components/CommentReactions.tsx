import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function CommentReactions({
  commentId,
  userId,
}: {
  commentId: string;
  userId?: string | undefined;
}) {
  const queryClient = useQueryClient();

  const votes = useQuery({
    queryKey: ["comment-likes", commentId, userId],
    queryFn: async () => {
      const [countsRes, mineRes] = await Promise.all([
        supabase.rpc("comment_vote_counts", { _comment_id: commentId }),
        userId
          ? supabase
              .from("comment_likes")
              .select("value")
              .eq("comment_id", commentId)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (countsRes.error) throw countsRes.error;
      if (mineRes.error) throw mineRes.error;
      const counts = countsRes.data?.[0];
      return {
        likes: Number(counts?.likes ?? 0),
        dislikes: Number(counts?.dislikes ?? 0),
        mine: mineRes.data?.value ?? 0,
      };
    },
  });

  const vote = useMutation({
    mutationFn: async (value: 1 | -1) => {
      if (!userId) throw new Error("Entre para reagir.");
      const current = votes.data?.mine ?? 0;
      if (current !== 0) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("user_id", userId)
          .eq("comment_id", commentId);
        if (error) throw error;
      }
      if (current !== value) {
        const { error } = await supabase
          .from("comment_likes")
          .insert({ user_id: userId, comment_id: commentId, value });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comment-likes", commentId] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro"),
  });

  const likes = votes.data?.likes ?? 0;
  const dislikes = votes.data?.dislikes ?? 0;
  const mine = votes.data?.mine ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => vote.mutate(1)}
        disabled={vote.isPending}
        aria-label="Curtir comentário"
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          mine === 1 ? "font-bold text-emerald-400" : "text-white/50 hover:text-emerald-400"
        }`}
      >
        <ThumbsUp className={`h-3.5 w-3.5 ${mine === 1 ? "fill-current" : ""}`} />
        {likes}
      </button>
      <button
        type="button"
        onClick={() => vote.mutate(-1)}
        disabled={vote.isPending}
        aria-label="Não curtir comentário"
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          mine === -1 ? "font-bold text-rose-400" : "text-white/50 hover:text-rose-400"
        }`}
      >
        <ThumbsDown className={`h-3.5 w-3.5 ${mine === -1 ? "fill-current" : ""}`} />
        {dislikes}
      </button>
    </>
  );
}
