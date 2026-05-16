import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface GitHubUser {
  login: string;
  name: string | null;
}

interface PushResult {
  repoUrl: string;
  created: boolean;
}

interface GitHubPushProps {
  onClose: () => void;
}

const GitHubPush: React.FC<GitHubPushProps> = ({ onClose }) => {
  const [repoName, setRepoName] = useState('urinal-protocol');
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  const { data: user, isLoading: userLoading, error: userError } = useQuery<GitHubUser>({
    queryKey: ['/api/github/user'],
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName }),
      }) as Promise<PushResult>;
    },
    onSuccess: (data) => {
      setPushResult(data);
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <Card className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🐙</span> Push to GitHub
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {userLoading && (
            <p className="text-gray-500 text-sm mb-4">🔄 Connecting to GitHub…</p>
          )}

          {userError && (
            <p className="text-red-500 text-sm mb-4">
              ❌ Could not connect to GitHub. Please reconnect.
            </p>
          )}

          {user && !pushResult && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Logged in as <strong>@{user.login}</strong>{user.name ? ` (${user.name})` : ''}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Repository name</label>
                <Input
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="urinal-protocol"
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Will create <strong>github.com/{user.login}/{repoName}</strong> if it doesn't exist.
                </p>
              </div>

              {pushMutation.isError && (
                <p className="text-red-500 text-sm mb-3">
                  ❌ {(pushMutation.error as any)?.message || 'Push failed. Try again.'}
                </p>
              )}

              <Button
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-bold"
                onClick={() => pushMutation.mutate()}
                disabled={pushMutation.isPending || !repoName.trim()}
              >
                {pushMutation.isPending ? '⏳ Pushing…' : '🚀 Push to GitHub'}
              </Button>
            </>
          )}

          {pushResult && (
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-green-600 mb-2">
                {pushResult.created ? 'Repo created & pushed!' : 'Pushed successfully!'}
              </p>
              <a
                href={pushResult.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm break-all"
              >
                {pushResult.repoUrl}
              </a>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={onClose}
              >
                Done ✅
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default GitHubPush;
