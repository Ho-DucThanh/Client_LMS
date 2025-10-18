// Forum feature removed: provide no-op API to preserve imports without functionality.
export const forumService = {
  async getForumPosts(): Promise<never> {
    throw new Error("Forum feature has been removed");
  },
  async createForumPost(): Promise<never> {
    throw new Error("Forum feature has been removed");
  },
  async getForumComments(): Promise<never> {
    throw new Error("Forum feature has been removed");
  },
  async createForumComment(): Promise<never> {
    throw new Error("Forum feature has been removed");
  },
};
