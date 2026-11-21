import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: '🐝 WordHive — a new word puzzle every day',
  });
};
